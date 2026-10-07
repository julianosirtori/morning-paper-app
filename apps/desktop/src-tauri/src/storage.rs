//! Edições salvas em disco (JSON), na pasta de dados do app, e PDFs em Documentos/Morning Paper.

use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

const KEEP: usize = 60;

fn editions_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("editions");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Salva a edição `n` (JSON vindo do React) e apaga as mais antigas que as últimas 60.
pub fn save_edition(app: &AppHandle, n: u32, json: &str) -> Result<(), String> {
    let dir = editions_dir(app)?;
    let tmp = dir.join(format!("{n:06}.json.tmp"));
    fs::write(&tmp, json).map_err(|e| e.to_string())?;
    fs::rename(&tmp, dir.join(format!("{n:06}.json"))).map_err(|e| e.to_string())?;
    let mut files = list_files(&dir)?;
    while files.len() > KEEP {
        let _ = fs::remove_file(files.remove(0));
    }
    Ok(())
}

fn list_files(dir: &PathBuf) -> Result<Vec<PathBuf>, String> {
    let mut files: Vec<PathBuf> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.extension().is_some_and(|x| x == "json"))
        .collect();
    files.sort();
    Ok(files)
}

/// Todas as edições salvas (JSON), da mais nova para a mais antiga.
pub fn list_editions(app: &AppHandle) -> Result<Vec<String>, String> {
    let dir = editions_dir(app)?;
    let mut out: Vec<String> = list_files(&dir)?
        .iter()
        .filter_map(|p| fs::read_to_string(p).ok())
        .collect();
    out.reverse();
    Ok(out)
}

/// Caminho do PDF da edição em ~/Documents/Morning Paper (a pasta é criada se preciso).
pub fn pdf_path(app: &AppHandle, file_name: &str) -> Result<String, String> {
    let dir = app
        .path()
        .document_dir()
        .map_err(|e| e.to_string())?
        .join("Morning Paper");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(file_name).to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Pasta temporária só deste teste (apagada no fim).
    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("morning-paper-storage-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn lists_only_json_editions_in_number_order() {
        let dir = temp_dir("list");
        // O nome com zeros à esquerda ({n:06}) faz a ordem alfabética ser a numérica.
        for name in ["000010.json", "000002.json", "000100.json", "000003.json.tmp", "notas.txt", "sem-extensao"] {
            fs::write(dir.join(name), "{}").unwrap();
        }
        let names: Vec<String> = list_files(&dir)
            .unwrap()
            .iter()
            .map(|p| p.file_name().unwrap().to_string_lossy().into_owned())
            .collect();
        assert_eq!(names, vec!["000002.json", "000010.json", "000100.json"]);
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn empty_and_missing_folders() {
        let dir = temp_dir("empty");
        assert!(list_files(&dir).unwrap().is_empty());
        fs::remove_dir_all(&dir).unwrap();
        assert!(list_files(&dir).is_err());
    }

    #[test]
    fn json_round_trip_keeps_the_content() {
        let dir = temp_dir("roundtrip");
        let json = r#"{"version":1,"n":7,"stories":[{"title":"Manchete com acentuação ✓"}]}"#;
        fs::write(dir.join(format!("{:06}.json", 7)), json).unwrap();
        let files = list_files(&dir).unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(fs::read_to_string(&files[0]).unwrap(), json);
        fs::remove_dir_all(&dir).unwrap();
    }
}
