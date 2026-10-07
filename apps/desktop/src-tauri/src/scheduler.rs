//! Agenda: no horário escolhido (ou assim que o app abrir, se o horário já passou
//! e ainda não há edição de hoje), avisa o React para gerar a edição. Só nos dias da
//! recorrência: todos os dias, a cada N dias ou em alguns dias da semana.

use std::sync::Mutex;
use std::time::Duration;

use chrono::{Datelike, Local, NaiveDate, NaiveTime};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

/// Recorrência (mesma regra de `src/lib/schedule.ts › runsOn`).
#[derive(Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Repeat {
    /// "daily" | "interval" | "weekdays" (vazio = todos os dias).
    pub mode: String,
    /// Intervalo em dias, no modo "interval".
    pub every: i64,
    /// Dias da semana (0 = domingo), no modo "weekdays".
    pub days: Vec<u32>,
    /// Primeiro dia da contagem do modo "interval" ("YYYY-MM-DD").
    pub from: String,
}

impl Repeat {
    pub fn runs_on(&self, day: NaiveDate) -> bool {
        match self.mode.as_str() {
            "weekdays" => self.days.contains(&day.weekday().num_days_from_sunday()),
            "interval" => match NaiveDate::parse_from_str(&self.from, "%Y-%m-%d") {
                Ok(from) if self.every >= 2 => (day - from).num_days().rem_euclid(self.every) == 0,
                _ => true,
            },
            _ => true,
        }
    }
}

#[derive(Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct Schedule {
    pub enabled: bool,
    /// "HH:MM"
    pub time: String,
    #[serde(default)]
    pub repeat: Repeat,
    /// Não gera edição neste dia ("YYYY-MM-DD"), usado por "Pausar até amanhã".
    pub skip_date: Option<String>,
    /// Dia da última edição gerada ("YYYY-MM-DD").
    pub last_run: Option<String>,
}

#[derive(Default)]
pub struct SchedulerState(pub Mutex<Option<Schedule>>);

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledRun {
    /// Minutos de atraso em relação ao horário (0 = na hora). O React só imprime sozinho se for pouco.
    pub late_minutes: i64,
}

/// Decide se é hora de gerar: hoje é dia de edição, o horário já passou, não foi pulado e ainda não saiu.
pub fn due(s: &Schedule, today: NaiveDate, now: NaiveTime) -> Option<i64> {
    if !s.enabled || !s.repeat.runs_on(today) {
        return None;
    }
    let at = NaiveTime::parse_from_str(&s.time, "%H:%M").ok()?;
    let today_s = today.format("%Y-%m-%d").to_string();
    if s.last_run.as_deref() == Some(&today_s)
        || s.skip_date.as_deref() == Some(&today_s)
        || now < at
    {
        return None;
    }
    Some((now - at).num_minutes())
}

pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(20)).await;
            let now = Local::now();
            let state = app.state::<SchedulerState>();
            let fire = {
                let mut guard = state.0.lock().unwrap();
                match guard.as_mut() {
                    Some(s) => due(s, now.date_naive(), now.time()).inspect(|_| {
                        // Marca já, para não disparar de novo enquanto o React gera a edição.
                        s.last_run = Some(now.date_naive().format("%Y-%m-%d").to_string());
                    }),
                    None => None,
                }
            };
            if let Some(late_minutes) = fire {
                let _ = app.emit("scheduled-edition", ScheduledRun { late_minutes });
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(time: &str, last: Option<&str>, skip: Option<&str>) -> Schedule {
        Schedule {
            enabled: true,
            time: time.into(),
            repeat: Repeat::default(),
            last_run: last.map(Into::into),
            skip_date: skip.map(Into::into),
        }
    }
    const D: &str = "2026-10-07";
    fn day() -> NaiveDate {
        NaiveDate::parse_from_str(D, "%Y-%m-%d").unwrap()
    }
    fn at(t: &str) -> NaiveTime {
        NaiveTime::parse_from_str(t, "%H:%M").unwrap()
    }

    #[test]
    fn fires_once_after_time() {
        assert_eq!(due(&s("06:00", None, None), day(), at("05:59")), None);
        assert_eq!(due(&s("06:00", None, None), day(), at("06:00")), Some(0));
        assert_eq!(
            due(&s("06:00", Some("2026-10-06"), None), day(), at("09:30")),
            Some(210)
        );
        assert_eq!(due(&s("06:00", Some(D), None), day(), at("09:30")), None);
    }

    #[test]
    fn respects_pause_and_disabled() {
        assert_eq!(due(&s("06:00", None, Some(D)), day(), at("07:00")), None);
        let mut off = s("06:00", None, None);
        off.enabled = false;
        assert_eq!(due(&off, day(), at("07:00")), None);
    }

    fn repeat(mode: &str, every: i64, days: &[u32], from: &str) -> Repeat {
        Repeat { mode: mode.into(), every, days: days.to_vec(), from: from.into() }
    }

    #[test]
    fn every_n_days_counts_from_start() {
        let r = repeat("interval", 2, &[], "2026-10-05");
        assert!(r.runs_on(day())); // 07 = 05 + 2
        assert!(!r.runs_on(day().succ_opt().unwrap()));
        assert!(r.runs_on(NaiveDate::from_ymd_opt(2026, 10, 3).unwrap())); // antes do início também segue o ritmo
        let three = repeat("interval", 3, &[], "2026-10-05");
        assert!(!three.runs_on(day()));
        assert!(three.runs_on(NaiveDate::from_ymd_opt(2026, 10, 8).unwrap()));
    }

    #[test]
    fn only_on_chosen_weekdays() {
        // 2026-10-07 é quarta-feira (3)
        assert!(repeat("weekdays", 0, &[1, 3], "").runs_on(day()));
        assert!(!repeat("weekdays", 0, &[1], "").runs_on(day()));
        let mut monday_only = s("06:00", None, None);
        monday_only.repeat = repeat("weekdays", 0, &[1], "");
        assert_eq!(due(&monday_only, day(), at("07:00")), None);
    }

    #[test]
    fn old_schedule_without_repeat_is_daily() {
        let json = r#"{"enabled":true,"time":"06:00","skipDate":null,"lastRun":null}"#;
        let old: Schedule = serde_json::from_str(json).unwrap();
        assert_eq!(due(&old, day(), at("06:10")), Some(10));
    }
}
