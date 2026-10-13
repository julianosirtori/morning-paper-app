//! Atualização automática: o app fica dias aberto só na barra de menus, então ele mesmo procura
//! versões novas no release do GitHub (latest.json), baixa, instala e reinicia escondido.
//!
//! O reinício espera um momento quieto: janela fechada, nada de IA, PDF ou impressão em andamento
//! (nem nos últimos minutos) e longe do horário da edição. Em 13/10 a correção da impressão das 06:00
//! estava publicada havia 4 dias, mas o Mac continuava na versão antiga.

use std::sync::atomic::{AtomicI64, AtomicUsize, Ordering};
use std::time::Duration;

use chrono::{Local, NaiveDate, NaiveTime};
use tauri::{AppHandle, Manager};
use tauri_plugin_updater::UpdaterExt;

use crate::scheduler::{Schedule, SchedulerState};

/// Primeira verificação depois de abrir (deixa a agenda e o React subirem antes).
const FIRST_CHECK: Duration = Duration::from_secs(2 * 60);
/// Intervalo entre verificações.
const CHECK_EVERY: Duration = Duration::from_secs(6 * 60 * 60);
/// Com uma versão instalada esperando, de quanto em quanto tempo ver se já dá para reiniciar.
const RESTART_POLL: Duration = Duration::from_secs(60);
/// Minutos sem trabalho (IA, feeds, PDF, impressão) antes de reiniciar.
const IDLE_MINUTES: i64 = 10;
/// Não reinicia nos minutos antes do horário da edição.
const BEFORE_SCHEDULE_MINUTES: i64 = 30;

/// Trabalho em andamento, para o reinício não cortar uma edição no meio.
#[derive(Default)]
pub struct Busy {
    running: AtomicUsize,
    /// Fim do último trabalho (timestamp em segundos).
    last_done: AtomicI64,
}

pub struct BusyGuard<'a>(&'a Busy);

impl Busy {
    pub fn start(&self) -> BusyGuard<'_> {
        self.running.fetch_add(1, Ordering::SeqCst);
        BusyGuard(self)
    }

    fn idle_minutes(&self, now: i64) -> Option<i64> {
        if self.running.load(Ordering::SeqCst) > 0 {
            return None;
        }
        Some((now - self.last_done.load(Ordering::SeqCst)) / 60)
    }
}

impl Drop for BusyGuard<'_> {
    fn drop(&mut self) {
        self.0.last_done.store(Local::now().timestamp(), Ordering::SeqCst);
        self.0.running.fetch_sub(1, Ordering::SeqCst);
    }
}

/// Pode reiniciar agora? Janela fechada, sem trabalho recente e fora da meia hora antes da edição de hoje.
pub fn quiet(
    window_visible: bool,
    idle_minutes: Option<i64>,
    schedule: Option<&Schedule>,
    today: NaiveDate,
    now: NaiveTime,
) -> bool {
    if window_visible || idle_minutes.is_none_or(|m| m < IDLE_MINUTES) {
        return false;
    }
    let Some(s) = schedule else { return true };
    let today_s = today.format("%Y-%m-%d").to_string();
    let pending_today = s.enabled
        && s.repeat.runs_on(today)
        && s.last_run.as_deref() != Some(&today_s)
        && s.skip_date.as_deref() != Some(&today_s);
    let Ok(at) = NaiveTime::parse_from_str(&s.time, "%H:%M") else { return true };
    // Já passou do horário sem sair edição: a agenda dispara a qualquer momento, melhor não reiniciar.
    !(pending_today && (at - now).num_minutes() < BEFORE_SCHEDULE_MINUTES)
}

pub fn start(app: AppHandle) {
    // Em `tauri dev` não há o que atualizar: o binário não está num .app.
    if cfg!(debug_assertions) {
        return;
    }
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(FIRST_CHECK).await;
        loop {
            match install_update(&app).await {
                Ok(Some(version)) => {
                    wait_quiet(&app).await;
                    crate::activity::log(&app, format!("[atualização] reiniciando na versão {version}"));
                    restart_hidden(&app);
                }
                Ok(None) => {}
                Err(e) => crate::activity::log(&app, format!("[atualização] falhou: {e}")),
            }
            tokio::time::sleep(CHECK_EVERY).await;
        }
    });
}

/// Procura versão nova; se houver, baixa e substitui o app em disco. Devolve a versão instalada.
async fn install_update(app: &AppHandle) -> Result<Option<String>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let Some(update) = updater.check().await.map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    crate::activity::log(
        app,
        format!("[atualização] baixando {} (atual {})", update.version, update.current_version),
    );
    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| e.to_string())?;
    crate::activity::log(app, format!("[atualização] {} instalada, reinicia quando estiver ocioso", update.version));
    Ok(Some(update.version))
}

async fn wait_quiet(app: &AppHandle) {
    loop {
        let visible = app
            .get_webview_window("main")
            .and_then(|w| w.is_visible().ok())
            .unwrap_or(false);
        let now = Local::now();
        let idle = app.state::<Busy>().idle_minutes(now.timestamp());
        let schedule = app.state::<SchedulerState>().0.lock().unwrap().clone();
        if quiet(visible, idle, schedule.as_ref(), now.date_naive(), now.time()) {
            return;
        }
        tokio::time::sleep(RESTART_POLL).await;
    }
}

/// Reabre a versão nova com `--hidden`, como no login do Mac: só na barra de menus, sem janela.
fn restart_hidden(app: &AppHandle) -> ! {
    let mut env = app.env();
    env.args_os.truncate(1);
    env.args_os.push("--hidden".into());
    tauri::process::restart(&env)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scheduler::Repeat;

    const D: &str = "2026-10-13";
    fn day() -> NaiveDate {
        NaiveDate::parse_from_str(D, "%Y-%m-%d").unwrap()
    }
    fn at(t: &str) -> NaiveTime {
        NaiveTime::parse_from_str(t, "%H:%M").unwrap()
    }
    fn s(last: Option<&str>) -> Schedule {
        Schedule {
            enabled: true,
            time: "06:00".into(),
            repeat: Repeat::default(),
            skip_date: None,
            last_run: last.map(Into::into),
        }
    }

    #[test]
    fn waits_for_closed_window_and_idle() {
        assert!(!quiet(true, Some(60), None, day(), at("14:00")));
        assert!(!quiet(false, None, None, day(), at("14:00")));
        assert!(!quiet(false, Some(IDLE_MINUTES - 1), None, day(), at("14:00")));
        assert!(quiet(false, Some(IDLE_MINUTES), None, day(), at("14:00")));
    }

    #[test]
    fn avoids_the_half_hour_before_the_edition() {
        let pending = s(Some("2026-10-12"));
        assert!(quiet(false, Some(60), Some(&pending), day(), at("05:29")));
        assert!(!quiet(false, Some(60), Some(&pending), day(), at("05:31")));
        // Passou do horário sem edição (Mac dormindo): a agenda vai disparar.
        assert!(!quiet(false, Some(60), Some(&pending), day(), at("07:00")));
        // Edição de hoje já saiu.
        assert!(quiet(false, Some(60), Some(&s(Some(D))), day(), at("07:00")));
    }

    #[test]
    fn ignores_schedule_when_off_or_paused() {
        let mut off = s(None);
        off.enabled = false;
        assert!(quiet(false, Some(60), Some(&off), day(), at("05:50")));
        let mut paused = s(None);
        paused.skip_date = Some(D.into());
        assert!(quiet(false, Some(60), Some(&paused), day(), at("05:50")));
    }
}
