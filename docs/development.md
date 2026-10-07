# Desenvolvimento

## Comandos

Pré-requisitos: Node 22.12+, pnpm 10 e Rust (`rustup`). No macOS também são necessárias as Command Line Tools do Xcode.

Rode tudo a partir da raiz; os scripts repassam para o app certo.

```bash
pnpm install      # instala os dois apps (um lockfile só)
pnpm app          # app de desktop em modo dev (tauri dev)
pnpm dev          # só o frontend no navegador: http://localhost:1420
                  # use ?lang=en ou ?lang=pt-BR para simular o idioma do sistema
pnpm test         # testes do frontend (Vitest)
pnpm test:e2e     # e2e com Playwright: app no navegador (WebKit) e landing (Chromium, WebKit, celular)
                  # na primeira vez: pnpm --filter @morning-paper/desktop exec playwright install chromium webkit
pnpm check        # typecheck + testes do frontend + testes do Rust + astro check
pnpm app:build    # gera o .app e o .dmg em apps/desktop/src-tauri/target/release/bundle/

pnpm landing:dev      # landing em http://localhost:4321/morning-paper-app/
pnpm landing:build    # astro check + build em apps/landing/dist
pnpm landing:preview  # serve o build
```

## Landing page

A página de download (`apps/landing`, Astro, site estático) é publicada no GitHub Pages pelo workflow `.github/workflows/landing.yml` a cada push na `main` que mexa nela ou na versão do app. Em Settings › Pages, a origem precisa ser **GitHub Actions**.

Os botões de download se adaptam ao computador de quem visita (`apps/landing/src/scripts/platform.ts`):

- **Mac com chip Apple** (ou Mac em que o navegador não informa o chip, como o Safari): "Baixar para Mac" abre o diálogo de instalação, que baixa o artefato do release no GitHub: `releases/download/v<versão>/Morning.Paper_<versão>_aarch64.dmg`.
- **Mac Intel, macOS antigo, Windows, Linux, Chromebook, celular**: o botão vira "Ver downloads" e leva para `/downloads/`, que explica por que não roda ali, marca o sistema na lista de plataformas e oferece copiar o link para abrir no Mac.
- Para conferir cada caso, use `?platform=` com `mac`, `mac-unknown`, `mac-intel`, `windows`, `linux`, `chromeos`, `ios` ou `android` (os testes e2e usam isso).

A versão vem de `@morning-paper/desktop/package.json` e o repositório de `REPO` em `apps/landing/src/config.ts`.
