# CI e release

- **`ci.yml`** (push na `main` e pull requests): typecheck + Vitest + `astro check`; `cargo test` em macOS; e2e com Playwright para os dois apps (os relatórios ficam como artefatos); e o build, que guarda o `.dmg` (`morning-paper-macos-aarch64`) e a landing (`landing-dist`) como artefatos do workflow.
- **`release.yml`** (tag `v*`): confere se a tag bate com a versão em `package.json` e `tauri.conf.json`, roda os testes, gera o `.dmg` e publica no release do GitHub, de onde a landing baixa. Para lançar: suba a versão nos dois arquivos e rode `git tag v<versão> && git push origin v<versão>`.
- **`landing.yml`**: publica a landing no GitHub Pages.

O `.dmg` não é assinado nem notarizado; por isso a landing explica como abrir em Ajustes do Sistema › Privacidade e Segurança. Para assinar, configure os secrets de certificado da Apple no `tauri-action`.
