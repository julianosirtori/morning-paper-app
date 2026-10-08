//! Log de atividade em ~/Library/Logs/app.morningpaper.desktop/activity.log para diagnosticar
//! a entrega da manhã: disparos de agenda, execução de IA, exportação e impressão de PDFs, eventos da UI.

use std::fs;

use chrono::NaiveDateTime;
use tauri::{AppHandle, Manager};

pub const MAX_BYTES: u64 = 512 * 1024;
pub const FILE_NAME: &str = "activity.log";

/// Formata uma entrada do log: "2026-10-08 06:00:01 mensagem\n"
pub fn line(now: NaiveDateTime, msg: &str) -> String {
    format!("{} {}\n", now.format("%Y-%m-%d %H:%M:%S"), msg)
}

/// Acrescenta uma linha ao arquivo de log. Cria o diretório pai se preciso.
/// Se o arquivo já existe e tem > MAX_BYTES, renomeia para <path>.1 (sobrescreve) antes de acrescentar.
/// Erros são impressos em stderr; a função nunca falha.
pub fn append(path: &std::path::Path, line_text: &str) {
    use std::io::Write;
    use std::fs::OpenOptions;

    // Cria diretório pai se preciso.
    if let Some(parent) = path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            eprintln!("[activity] erro ao criar diretório: {}", e);
            return;
        }
    }

    // Verifica tamanho; se passou de MAX_BYTES, rotaciona.
    if let Ok(metadata) = fs::metadata(path) {
        if metadata.len() > MAX_BYTES {
            let mut rotated = path.to_path_buf();
            let mut name = rotated
                .file_name()
                .and_then(|n| n.to_str())
                .map(String::from)
                .unwrap_or_default();
            name.push_str(".1");
            rotated.set_file_name(name);
            if let Err(e) = fs::rename(path, &rotated) {
                eprintln!("[activity] erro ao rotacionar log: {}", e);
            }
        }
    }

    // Acrescenta ao arquivo.
    match OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
    {
        Ok(mut f) => {
            if let Err(e) = f.write_all(line_text.as_bytes()) {
                eprintln!("[activity] erro ao escrever log: {}", e);
            }
        }
        Err(e) => {
            eprintln!("[activity] erro ao abrir arquivo de log: {}", e);
        }
    }
}

/// Grava uma linha no log com a hora local atual. Também imprime em stderr.
pub fn log(app: &AppHandle, msg: impl AsRef<str>) {
    let msg_str = msg.as_ref();
    eprintln!("[activity] {}", msg_str);
    let path = match app.path().app_log_dir() {
        Ok(p) => p.join(FILE_NAME),
        Err(e) => {
            eprintln!("[activity] erro ao obter app_log_dir: {}", e);
            return;
        }
    };
    let now = chrono::Local::now().naive_local();
    let line_text = line(now, msg_str);
    append(&path, &line_text);
}

#[cfg(test)]
#[path = "activity_tests.rs"]
mod tests;
