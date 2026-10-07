# Política de segurança

## Versões com suporte

Só a versão mais recente publicada em [Releases](https://github.com/julianosirtori/morning-paper-app/releases) recebe correções de segurança.

## Como relatar uma vulnerabilidade

**Não abra uma issue pública.** Use o relato privado do GitHub: aba **Security › Report a vulnerability** no repositório ([link direto](https://github.com/julianosirtori/morning-paper-app/security/advisories/new)).

Inclua, se possível:

- versão do app e do macOS;
- descrição do problema e o impacto esperado;
- passos para reproduzir ou uma prova de conceito.

Você deve receber uma resposta em até 7 dias. Depois da correção, o relato pode ser publicado com o crédito para quem encontrou, se quiser.

## Escopo

Pontos especialmente sensíveis no app:

- conteúdo vindo de feeds RSS/Atom e de sites de terceiros (`feeds.rs`, limpeza de HTML em `src/engine/`);
- execução dos CLIs de IA (`ai.rs`) e do `lp`/`pmset` (`pdf.rs`, `system.rs`);
- comandos expostos pelo Tauri ao frontend (`lib.rs`).
