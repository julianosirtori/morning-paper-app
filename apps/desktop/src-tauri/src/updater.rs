//! Atualizações: o app fica dias aberto só na barra de menus, então ele mesmo procura versões novas
//! no release do GitHub (latest.json). Com "Instalar automaticamente" ligado, baixa, instala e
//! reinicia escondido; desligado, só avisa e a pessoa instala pelas Preferências. O React acompanha
//! tudo pelo evento `update-status` (aviso na barra lateral, Preferências e notificação).
//!
//! O reinício automático espera um momento quieto: janela fechada, nada de IA, PDF ou impressão em andamento
//! (nem nos últimos minutos) e longe do horário da edição. Em 13/10 a correção da impressão das 06:00
//! estava publicada havia 4 dias, mas o Mac continuava na versão antiga.

use std::sync::atomic::{AtomicBool, AtomicI64, AtomicUsize, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use chrono::{Local, NaiveDate, NaiveTime};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

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

/// Etapa da atualização, mostrada no React.
#[derive(Serialize, Clone, Copy, PartialEq, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub enum Phase {
    #[default]
    Idle,
    Checking,
    UpToDate,
    /// Há versão nova e a instalação automática está desligada.
    Available,
    Downloading,
    /// Instalada em disco; vale depois de reiniciar.
    Ready,
    Error,
}

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub phase: Phase,
    pub current: String,
    /// Versão nova (disponível, baixando ou pronta).
    pub version: Option<String>,
    /// Progresso do download, de 0 a 1.
    pub progress: Option<f64>,
    pub error: Option<String>,
    /// Última verificação (ISO 8601).
    pub checked_at: Option<String>,
}

pub struct UpdateState {
    status: Mutex<Status>,
    /// Preferência "Instalar atualizações automaticamente" (vem do React).
    pub auto: AtomicBool,
    /// Uma verificação ou instalação por vez.
    working: AtomicBool,
    /// Já há uma tarefa esperando o momento quieto para reiniciar.
    restart_scheduled: AtomicBool,
    /// Versão encontrada na última verificação, para instalar sem baixar o latest.json de novo.
    pending: Mutex<Option<Update>>,
}

impl Default for UpdateState {
    fn default() -> Self {
        Self {
            status: Mutex::new(Status::default()),
            auto: AtomicBool::new(true),
            working: AtomicBool::new(false),
            restart_scheduled: AtomicBool::new(false),
            pending: Mutex::new(None),
        }
    }
}

pub fn status(app: &AppHandle) -> Status {
    let mut s = app.state::<UpdateState>().status.lock().unwrap().clone();
    s.current = app.package_info().version.to_string();
    s
}

fn set_status(app: &AppHandle, f: impl FnOnce(&mut Status)) {
    {
        let state = app.state::<UpdateState>();
        let mut s = state.status.lock().unwrap();
        f(&mut s);
    }
    let _ = app.emit("update-status", status(app));
}

pub fn start(app: AppHandle) {
    // Em `tauri dev` não há o que atualizar: o binário não está num .app.
    if cfg!(debug_assertions) {
        return;
    }
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(FIRST_CHECK).await;
        loop {
            let _ = check(&app, false).await;
            tokio::time::sleep(CHECK_EVERY).await;
        }
    });
}

/// Procura versão nova. Com a instalação automática ligada (ou `install`), baixa e instala na hora.
pub async fn check(app: &AppHandle, install: bool) -> Result<Status, String> {
    let state = app.state::<UpdateState>();
    if state.status.lock().unwrap().phase == Phase::Ready {
        return Ok(status(app));
    }
    if state.working.swap(true, Ordering::SeqCst) {
        return Ok(status(app));
    }
    let result = check_inner(app, install).await;
    state.working.store(false, Ordering::SeqCst);
    if let Err(e) = &result {
        crate::activity::log(app, format!("[atualização] falhou: {e}"));
        set_status(app, |s| {
            s.phase = Phase::Error;
            s.error = Some(e.clone());
            s.progress = None;
        });
    }
    result.map(|_| status(app))
}

async fn check_inner(app: &AppHandle, install: bool) -> Result<(), String> {
    let state = app.state::<UpdateState>();
    let pending = state.pending.lock().unwrap().take();
    let update = match pending {
        Some(u) if install => Some(u),
        _ => {
            set_status(app, |s| {
                s.phase = Phase::Checking;
                s.error = None;
            });
            let updater = app.updater().map_err(|e| e.to_string())?;
            let found = updater.check().await.map_err(|e| e.to_string())?;
            set_status(app, |s| s.checked_at = Some(Local::now().to_rfc3339()));
            found
        }
    };
    let Some(update) = update else {
        set_status(app, |s| {
            s.phase = Phase::UpToDate;
            s.version = None;
        });
        return Ok(());
    };
    let version = update.version.clone();
    if !install && !state.auto.load(Ordering::SeqCst) {
        crate::activity::log(app, format!("[atualização] {version} disponível"));
        set_status(app, |s| {
            s.phase = Phase::Available;
            s.version = Some(version);
        });
        *state.pending.lock().unwrap() = Some(update);
        return Ok(());
    }

    crate::activity::log(
        app,
        format!("[atualização] baixando {version} (atual {})", update.current_version),
    );
    set_status(app, |s| {
        s.phase = Phase::Downloading;
        s.version = Some(version.clone());
        s.progress = Some(0.0);
    });
    let mut done = 0usize;
    let mut last_pct = -1i64;
    let progress_app = app.clone();
    update
        .download_and_install(
            move |chunk, total| {
                done += chunk;
                let Some(total) = total.filter(|t| *t > 0) else { return };
                let p = done as f64 / total as f64;
                // Um evento a cada 5%, não um por pedaço baixado.
                let pct = (p * 20.0) as i64;
                if pct != last_pct {
                    last_pct = pct;
                    set_status(&progress_app, |s| s.progress = Some(p.min(1.0)));
                }
            },
            || {},
        )
        .await
        .map_err(|e| e.to_string())?;
    crate::activity::log(app, format!("[atualização] {version} instalada, reinicia quando estiver ocioso"));
    set_status(app, |s| {
        s.phase = Phase::Ready;
        s.progress = None;
    });
    schedule_restart(app);
    Ok(())
}

/// Espera o momento quieto e reinicia na versão nova.
fn schedule_restart(app: &AppHandle) {
    if app.state::<UpdateState>().restart_scheduled.swap(true, Ordering::SeqCst) {
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        wait_quiet(&app).await;
        restart(&app, true);
    });
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

/// Reabre o app na versão nova. Escondido (`--hidden`, como no login do Mac) no reinício automático;
/// com a janela aberta quando a pessoa clica em "Reiniciar agora".
pub fn restart(app: &AppHandle, hidden: bool) -> ! {
    let version = status(app).version.unwrap_or_default();
    crate::activity::log(app, format!("[atualização] reiniciando na versão {version}"));
    let mut env = app.env();
    env.args_os.truncate(1);
    if hidden {
        env.args_os.push("--hidden".into());
    }
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
