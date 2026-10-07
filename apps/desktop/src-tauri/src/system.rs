//! Consultas ao sistema: impressoras (CUPS) e assistentes de IA no PATH.

use std::collections::HashMap;
use std::process::{Command, Stdio};

use serde::Serialize;

/* ---------- Impressoras ---------- */

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Printer {
    /// Nome da fila no CUPS (ex.: `Brother_HL_L2350DW_series`).
    pub id: String,
    /// Nome para mostrar (fila sem sublinhados).
    pub name: String,
    /// Descrição do driver/modelo.
    pub info: String,
    /// "usb", "network" ou "local" (o texto exibido é traduzido no React).
    pub connection: String,
    /// "idle", "printing" ou "disabled".
    pub state: String,
    pub is_default: bool,
}

fn run(cmd: &str, args: &[&str]) -> String {
    Command::new(cmd)
        .args(args)
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).into_owned())
        .unwrap_or_default()
}

/// Lista as filas do CUPS. O `lpstat` do macOS responde no idioma do sistema (ignora LANG),
/// então usamos só saídas que não são traduzidas: `lpstat -e` (nomes) e `lpoptions -p`
/// (atributos IPP em chave=valor). A impressora padrão vem do fim da linha de `lpstat -d`.
pub fn list_printers() -> Vec<Printer> {
    let default_line = run("/usr/bin/lpstat", &["-d"]);
    let default_id = default_line
        .trim()
        .rsplit_once(": ")
        .map(|(_, n)| n.trim())
        .unwrap_or("");
    run("/usr/bin/lpstat", &["-e"])
        .lines()
        .map(str::trim)
        .filter(|id| !id.is_empty())
        .map(|id| {
            printer_from_options(
                id,
                &run("/usr/bin/lpoptions", &["-p", id]),
                id == default_id,
            )
        })
        .collect()
}

/// Separa `chave=valor` respeitando aspas simples/duplas e espaços escapados (`\ `).
pub fn parse_options(line: &str) -> HashMap<String, String> {
    let mut out = HashMap::new();
    let mut tokens: Vec<String> = Vec::new();
    let (mut cur, mut quote, mut escaped) = (String::new(), None::<char>, false);
    for c in line.trim().chars() {
        if escaped {
            cur.push(c);
            escaped = false;
        } else if c == '\\' {
            escaped = true;
        } else if let Some(q) = quote {
            if c == q {
                quote = None
            } else {
                cur.push(c)
            }
        } else if c == '\'' || c == '"' {
            quote = Some(c);
        } else if c.is_whitespace() {
            if !cur.is_empty() {
                tokens.push(std::mem::take(&mut cur));
            }
        } else {
            cur.push(c);
        }
    }
    if !cur.is_empty() {
        tokens.push(cur);
    }
    for t in tokens {
        if let Some((k, v)) = t.split_once('=') {
            out.insert(k.to_string(), v.to_string());
        }
    }
    out
}

/// Ajustes "Preto e branco – Rascunho" (como o preset do macOS) que a impressora aceita.
/// Lê `lpoptions -p <impressora> -l`; as chaves e os valores do PPD não são traduzidos.
pub fn bw_draft_options(printer: &str) -> Vec<(String, String)> {
    pick_bw_draft(&run("/usr/bin/lpoptions", &["-p", printer, "-l"]))
}

/// Escolhe, nas opções do PPD ("ColorModel/Color Mode: Gray *RGB…"), o valor cinza e o de rascunho.
pub fn pick_bw_draft(listing: &str) -> Vec<(String, String)> {
    const COLOR_KEYS: [&str; 6] = ["ColorModel", "ColorMode", "cupsColorMode", "BRMonoColor", "CNColorMode", "SelectColor"];
    const GRAY: [&str; 8] = ["Gray", "Grayscale", "DeviceGray", "Mono", "Monochrome", "Black", "KGray", "Gray16"];
    const QUALITY_KEYS: [&str; 5] = ["cupsPrintQuality", "PrintQuality", "OutputMode", "Quality", "HPPrintQuality"];
    const DRAFT: [&str; 5] = ["Draft", "FastDraft", "Fast", "EconoMode", "Economy"];
    let mut out = Vec::new();
    for line in listing.lines() {
        let Some((head, values)) = line.split_once(':') else { continue };
        let key = head.split('/').next().unwrap_or("").trim();
        let values: Vec<&str> = values.split_whitespace().map(|v| v.trim_start_matches('*')).collect();
        let pick = |wanted: &[&str]| {
            wanted.iter().find_map(|w| values.iter().find(|v| v.eq_ignore_ascii_case(w)).map(|v| v.to_string()))
        };
        let choice = if COLOR_KEYS.contains(&key) {
            pick(&GRAY)
        } else if QUALITY_KEYS.contains(&key) {
            pick(&DRAFT)
        } else {
            None
        };
        if let Some(v) = choice {
            out.push((key.to_string(), v));
        }
    }
    out
}

fn printer_from_options(id: &str, options: &str, is_default: bool) -> Printer {
    let o = parse_options(options);
    let name = id.replace('_', " ");
    // printer-state (RFC 8011): 3 = ociosa, 4 = imprimindo, 5 = parada
    let accepting = o
        .get("printer-is-accepting-jobs")
        .map(|v| v != "false")
        .unwrap_or(true);
    let state = match o.get("printer-state").map(String::as_str) {
        _ if !accepting => "disabled",
        Some("5") => "disabled",
        Some("4") => "printing",
        _ => "idle",
    };
    Printer {
        info: o
            .get("printer-info")
            .or(o.get("printer-make-and-model"))
            .cloned()
            .unwrap_or_else(|| name.clone()),
        connection: connection_for(o.get("device-uri").map(String::as_str).unwrap_or(""))
            .to_string(),
        state: state.to_string(),
        is_default,
        name,
        id: id.to_string(),
    }
}

fn connection_for(uri: &str) -> &'static str {
    if uri.starts_with("usb:") {
        "usb"
    } else if [
        "dnssd:", "ipp:", "ipps:", "lpd:", "socket:", "http:", "https:", "smb:",
    ]
    .iter()
    .any(|p| uri.starts_with(p))
    {
        "network"
    } else {
        "local"
    }
}

/* ---------- Assistentes de IA ---------- */

/// Idioma preferido do macOS (ex.: "pt-BR", "en-US"). O `navigator.language` do WebView
/// segue as localizações do bundle, não a do sistema, por isso perguntamos aqui.
pub fn system_locale() -> String {
    sys_locale::get_locale().unwrap_or_else(|| "en-US".into())
}

/* ---------- Acordar o Mac ---------- */

/// Agenda (ou cancela) o despertar diário do Mac 5 minutos antes da edição, com `pmset repeat`.
/// Precisa de senha de administrador: o macOS mostra o pedido de autorização.
pub fn set_wake(enabled: bool, time: &str) -> Result<(), String> {
    let cmd = if enabled {
        let (h, m) = time.split_once(':').ok_or("horário inválido")?;
        let total = h.parse::<i32>().map_err(|e| e.to_string())? * 60
            + m.parse::<i32>().map_err(|e| e.to_string())?
            - 5;
        let total = total.rem_euclid(24 * 60);
        format!(
            "pmset repeat wakeorpoweron MTWRFSU {:02}:{:02}:00",
            total / 60,
            total % 60
        )
    } else {
        "pmset repeat cancel".to_string()
    };
    let script = format!("do shell script \"{cmd}\" with administrator privileges");
    let out = Command::new("/usr/bin/osascript")
        .args(["-e", &script])
        .stdin(Stdio::null())
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

pub const AGENT_CMDS: [&str; 5] = ["claude", "codex", "gemini", "ollama", "opencode"];

/// Apps abertos pelo Finder não herdam o PATH do terminal, então perguntamos ao shell
/// de login do usuário e, se preciso, olhamos as pastas mais comuns de instalação.
pub fn detect_agents() -> HashMap<String, Option<String>> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
    let script = AGENT_CMDS
        .iter()
        .map(|c| format!("command -v {c} 2>/dev/null"))
        .collect::<Vec<_>>()
        .join("; ");
    let out = Command::new(&shell)
        .args(["-ilc", &script])
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).into_owned())
        .unwrap_or_default();

    let home = std::env::var("HOME").unwrap_or_default();
    let fallback_dirs = [
        "/opt/homebrew/bin".to_string(),
        "/usr/local/bin".to_string(),
        format!("{home}/.local/bin"),
        format!("{home}/.claude/local"),
        format!("{home}/.bun/bin"),
        format!("{home}/.npm-global/bin"),
        format!("{home}/.opencode/bin"),
    ];

    AGENT_CMDS
        .iter()
        .map(|cmd| {
            let from_shell = out
                .lines()
                .map(str::trim)
                .find(|l| l.starts_with('/') && l.rsplit('/').next() == Some(cmd))
                .map(String::from);
            let found = from_shell.or_else(|| {
                fallback_dirs
                    .iter()
                    .map(|d| format!("{d}/{cmd}"))
                    .find(|p| std::path::Path::new(p).exists())
            });
            (cmd.to_string(), found)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    #[test]
    fn picks_gray_and_draft_like_the_macos_preset() {
        let hp = "ColorModel/Color Mode: Gray Gray16 DeviceGray DeviceGray16 *RGB AdobeRGB\n\
                  cupsPrintQuality/Quality: Draft *Normal High\n\
                  MediaType/MediaType: stationery *any\n";
        assert_eq!(
            super::pick_bw_draft(hp),
            vec![("ColorModel".to_string(), "Gray".to_string()), ("cupsPrintQuality".to_string(), "Draft".to_string())]
        );
        // Impressora sem essas opções: nada a ajustar.
        assert!(super::pick_bw_draft("PageSize/Media Size: *A4 Letter\n").is_empty());
    }

    use super::*;

    #[test]
    fn parses_quoted_and_escaped_options() {
        let o = parse_options(
            r"copies=1 device-uri=dnssd://HP%20Smart._ipps._tcp.local./ marker-names='cyan\ ink,black\ ink' printer-info='HP Smart Tank 580-590 series' printer-state=3",
        );
        assert_eq!(o["printer-info"], "HP Smart Tank 580-590 series");
        assert_eq!(o["marker-names"], "cyan ink,black ink");
        assert_eq!(o["printer-state"], "3");
    }

    #[test]
    fn builds_printer_from_options() {
        let p = printer_from_options(
            "Office_Printer",
            "device-uri=usb://Brother/HL printer-info='Brother HL-L2350DW' printer-state=3",
            true,
        );
        assert_eq!(p.name, "Office Printer");
        assert_eq!(p.info, "Brother HL-L2350DW");
        assert_eq!(p.connection, "usb");
        assert_eq!(p.state, "idle");
        assert!(p.is_default);

        let stopped =
            printer_from_options("HP", "device-uri=ipps://hp.local printer-state=5", false);
        assert_eq!(stopped.state, "disabled");
        assert_eq!(stopped.connection, "network");
        let paused = printer_from_options(
            "X",
            "printer-state=3 printer-is-accepting-jobs=false",
            false,
        );
        assert_eq!(paused.state, "disabled");
    }

    #[test]
    fn lists_printers_on_this_machine_without_panicking() {
        let _ = list_printers();
    }
}
