//! Resumo por IA usando um assistente de linha de comando já instalado e logado no Mac.
//! O prompt vai pelo stdin (ou argumento, conforme o CLI); a resposta é o stdout.

use std::process::Stdio;
use std::time::Duration;

use tokio::io::AsyncWriteExt;
use tokio::process::Command;

const TIMEOUT: Duration = Duration::from_secs(6 * 60);

/// Argumentos de cada CLI para rodar um prompt sem interação.
/// `true` no segundo item = o prompt vai pelo stdin; `false` = vai como último argumento.
fn invocation(agent: &str, model: Option<&str>) -> Result<(Vec<String>, bool), String> {
    let s = |v: &[&str]| v.iter().map(|x| x.to_string()).collect::<Vec<_>>();
    Ok(match agent {
        "claude" => (s(&["-p", "--output-format", "text"]), true),
        "codex" => (s(&["exec", "--skip-git-repo-check", "-"]), true),
        "gemini" => (s(&["-p"]), false),
        "opencode" => (s(&["run"]), false),
        "ollama" => {
            let model =
                model.ok_or("ollama: nenhum modelo instalado (rode `ollama pull llama3.2`)")?;
            (vec!["run".into(), model.into()], true)
        }
        other => return Err(format!("assistente desconhecido: {other}")),
    })
}

/// Primeiro modelo listado por `ollama list`.
async fn ollama_model(shell: &str, path: &str) -> Option<String> {
    let out = Command::new(shell)
        .args(["-ilc", "exec \"$0\" list", path])
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .output()
        .await
        .ok()?;
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .skip(1)
        .find_map(|l| l.split_whitespace().next().map(String::from))
}

/// Roda o assistente `agent` (caminho absoluto `path`) com o prompt e devolve a resposta.
/// Usa o shell de login para herdar o PATH do usuário (os CLIs costumam precisar do node).
pub async fn run(agent: &str, path: &str, prompt: &str) -> Result<String, String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
    let model = if agent == "ollama" {
        ollama_model(&shell, path).await
    } else {
        None
    };
    let (mut args, via_stdin) = invocation(agent, model.as_deref())?;
    if !via_stdin {
        args.push(prompt.to_string());
    }

    // `exec "$0" "$@"` repassa os argumentos sem precisar escapar nada.
    let mut child = Command::new(&shell)
        .arg("-ilc")
        .arg("exec \"$0\" \"$@\"")
        .arg(path)
        .args(&args)
        .current_dir(std::env::temp_dir())
        .stdin(if via_stdin {
            Stdio::piped()
        } else {
            Stdio::null()
        })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("não foi possível iniciar {agent}: {e}"))?;

    if via_stdin {
        let mut stdin = child.stdin.take().ok_or("stdin indisponível")?;
        stdin
            .write_all(prompt.as_bytes())
            .await
            .map_err(|e| e.to_string())?;
        drop(stdin);
    }

    let out = tokio::time::timeout(TIMEOUT, child.wait_with_output())
        .await
        .map_err(|_| format!("{agent} demorou mais de {} minutos", TIMEOUT.as_secs() / 60))?
        .map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if !out.status.success() || stdout.is_empty() {
        let err = String::from_utf8_lossy(&out.stderr);
        let last = err
            .lines()
            .rev()
            .find(|l| !l.trim().is_empty())
            .unwrap_or("sem resposta");
        return Err(format!("{agent}: {last}"));
    }
    Ok(stdout)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_invocations() {
        assert!(invocation("claude", None).unwrap().1);
        assert_eq!(invocation("gemini", None).unwrap().0, vec!["-p"]);
        assert!(invocation("ollama", None).is_err());
        assert_eq!(
            invocation("ollama", Some("llama3.2")).unwrap().0,
            vec!["run", "llama3.2"]
        );
        assert!(invocation("x", None).is_err());
    }

    /// Roda o CLI de verdade: `MP_AI_TEST=claude:/caminho cargo test -- --ignored real_agent`
    #[test]
    #[ignore]
    fn real_agent_answers() {
        let Ok(spec) = std::env::var("MP_AI_TEST") else {
            return;
        };
        let (agent, path) = spec.split_once(':').unwrap();
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        let out = rt.block_on(run(
            agent,
            path,
            "Reply with exactly this JSON and nothing else: {\"ok\":true}",
        ));
        eprintln!("{agent}: {out:?}");
        assert!(out.unwrap().contains("\"ok\""));
    }
}
