# CI e release

- **`ci.yml`** (push na `main` e pull requests): typecheck + Vitest + `astro check`; `cargo test` em macOS; e2e com Playwright para os dois apps (os relatórios ficam como artefatos); e o build, que guarda o `.dmg` (`morning-paper-macos-aarch64`) e a landing (`landing-dist`) como artefatos do workflow.
- **`release.yml`** (tag `v*`): confere se a tag bate com a versão em `package.json` e `tauri.conf.json`, roda os testes, gera o `.dmg` e publica no release do GitHub, de onde a landing baixa. Para lançar, veja [Lançando uma versão](#lançando-uma-versão).
- **`landing.yml`**: publica a landing no GitHub Pages.

O `.dmg` não é assinado nem notarizado; por isso a landing explica como abrir em Ajustes do Sistema › Privacidade e Segurança. Para assinar, configure os secrets de certificado da Apple no `tauri-action`.

## Lançando uma versão

```bash
pnpm release patch            # 0.8.4 → 0.8.5 (também aceita minor, major ou uma versão exata: 1.0.0)
pnpm release minor --dry-run  # mostra o que mudaria, sem alterar nada
```

O script [`scripts/release.mjs`](../scripts/release.mjs):

1. confere que você está na `main`, sem mudanças pendentes, em dia com a `origin/main` e que a tag ainda não existe;
2. sobe a versão em `apps/desktop/package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` e `Cargo.lock`;
3. transforma a seção "Não lançado" do `CHANGELOG.md` na seção da versão nova, com a data, e atualiza os links de comparação;
4. pede confirmação (pule com `--yes`), faz o commit `Release vX.Y.Z`, cria a tag e envia a `main` e a tag juntas.

O push da tag dispara o `release.yml`, e o da `main` faz a landing apontar para o `.dmg` novo. Antes de lançar, escreva as notas na seção "Não lançado" do CHANGELOG.
