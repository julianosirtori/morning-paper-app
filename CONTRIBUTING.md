# Como contribuir

Obrigado pelo interesse no Morning Paper! Este guia explica como preparar o ambiente, o que esperamos de uma contribuição e como ela chega na `main`.

Ao participar, você concorda em seguir o [Código de Conduta](CODE_OF_CONDUCT.md).

## Antes de começar

- **Bugs**: procure nas [issues](https://github.com/julianosirtori/morning-paper-app/issues) se já foi relatado. Se não, abra uma usando o modelo de bug.
- **Ideias e funcionalidades novas**: abra uma issue antes de escrever código, para combinarmos o escopo. Mudanças pequenas (texto, correção óbvia, teste) podem ir direto para um pull request.
- **Falhas de segurança**: não abra issue pública. Veja [SECURITY.md](SECURITY.md).

## Ambiente

Pré-requisitos: macOS, Node 22.12+, pnpm 10, Rust (`rustup`) e as Command Line Tools do Xcode.

```bash
pnpm install
pnpm app          # app de desktop em modo dev
pnpm dev          # só o frontend no navegador (sem rede nem IA, usa conteúdo de exemplo)
```

Mais detalhes em [docs/development.md](docs/development.md). Para entender como o código está organizado, leia [docs/architecture.md](docs/architecture.md).

## Fluxo de trabalho

1. Faça um fork e crie um branch a partir da `main` (`fix/impressao-a4`, `feat/fonte-opml`…).
2. Faça a mudança com testes, quando fizer sentido:
   - lógica de geração da edição (`apps/desktop/src/engine/`): testes no Vitest;
   - código Rust (`apps/desktop/src-tauri/`): `cargo test`;
   - fluxos de tela: Playwright (`apps/desktop/e2e/`, `apps/landing/e2e/`).
3. Rode a verificação completa antes de abrir o PR:
   ```bash
   pnpm check
   pnpm test:e2e
   ```
4. Abra o pull request preenchendo o modelo. A CI precisa passar.

## Convenções

- **Idioma**: o código (nomes) é em inglês; comentários, documentação e mensagens de commit são em português.
- **Textos da interface**: nunca escreva texto direto no componente. Adicione a chave em `apps/desktop/src/i18n/locales/pt-BR.json` **e** em `en.json`.
- **Estilo**: siga o código ao redor. As configurações de editor estão no `.editorconfig`; o Rust segue o `rustfmt` padrão (`cargo fmt`).
- **Commits**: mensagens curtas no imperativo, de preferência no formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
- **Escopo**: um assunto por pull request. Refatorações grandes misturadas com funcionalidades dificultam a revisão.
- **Changelog**: se a mudança aparece para quem usa o app, adicione uma linha em `CHANGELOG.md`, na seção "Não lançado".

## Documentação

A documentação fica em [`docs/`](docs/README.md). Se a sua mudança altera um comportamento descrito ali (ou no README), atualize no mesmo PR.

## Licença

Ao contribuir, você concorda que sua contribuição será licenciada sob a [licença MIT](LICENSE) do projeto.
