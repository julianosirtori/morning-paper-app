# Arquitetura

Como o app gera uma edição, do agendamento à impressão, e onde fica cada parte do código.

## Stack

- **Tauri v2** (Rust) para a janela nativa, o ícone na barra de menus, a impressão e o acesso ao sistema
- **React 19 + TypeScript**, com Vite
- **Tailwind CSS v4** (tokens em `@theme` no `apps/desktop/src/styles.css`)
- **Zustand** para o estado, com `persist` para as preferências
- **i18next + react-i18next** para português (pt-BR) e inglês, seguindo o idioma do macOS
- **Vitest** (frontend), `cargo test` (Rust) e **Playwright** (e2e)

## Como funciona

1. **Onboarding** (primeira abertura): fontes sugeridas no idioma do Mac ou qualquer site/feed (conferido na hora), horário, tamanho, assuntos, impressora, assistente de IA e segundo plano. Termina gerando a primeira edição.
2. **Agendador** (Rust, `scheduler.rs`): no horário escolhido avisa o React para gerar a edição. Se o Mac estava desligado, ela é gerada quando o app abrir, mas só é impressa se o atraso for de até 2 horas. Respeita "Pausar até amanhã".
3. **Coleta** (Rust, `feeds.rs`): baixa os feeds RSS/Atom em paralelo. Aceita o endereço de um site e encontra o feed anunciado nele. As notícias da cidade (Fontes › Notícias da sua cidade) vêm de uma busca do Google Notícias pelo nome da cidade, na seção "Sua cidade".
4. **Pauta** (`src/engine/`):
   - limpa o HTML;
   - junta a mesma notícia contada por fontes diferentes;
   - descarta o que tem mais de 36 horas;
   - dá uma nota a cada notícia (prioridade da fonte, quantas fontes, se é recente, se tem foto);
   - escolhe as notícias respeitando o peso de cada assunto.
5. **Resumo por IA** (opcional, `ai.rs` + `engine/ai.ts`): o CLI escolhido (claude, codex, gemini, ollama, opencode) recebe as notícias e devolve JSON com títulos, resumos, textos e a manchete, no idioma da edição. Se falhar, a edição sai com o texto das fontes.
6. **Diagramação** (`engine/compose.ts`): capa (manchete, chamadas para as páginas internas, mais notícias, índice e curtas) e páginas internas agrupadas por seção. As fotos dos feeds são impressas em preto e branco com retícula.
7. **Entrega** (`services/delivery.ts`): PDF em `~/Documents/Morning Paper`, impressão sem diálogo (`lp`) na impressora padrão e notificação.
8. **Histórico**: as edições ficam salvas em JSON na pasta de dados do app. A Revisão edita a edição salva.

## Estrutura do app desktop

Tudo abaixo fica em `apps/desktop/`.

```
src/
  main.tsx               inicia o i18n e depois carrega o App
  App.tsx                hooks globais e roteamento por hash entre as 6 telas
  styles.css             tema do Tailwind, componentes base e a página do jornal (.np-*)
  i18n/                  configuração e locales/{pt-BR,en}.json, com chaves tipadas
  data/                  tipos, constantes e conteúdo de exemplo (content/{pt-BR,en}.ts)
  engine/                geração da edição: texto, agrupamento, pauta, IA e diagramação (funções puras, testadas)
  services/              coleta/validação de feeds, entrega (PDF + impressão), despertar do Mac
  lib/                   ponte com o Tauri (native.ts), datas, OPML e seletor de arquivo
  store/                 stores Zustand por domínio: navegação, edições, leitura, fontes,
                         preferências, sistema (impressoras/IA), impressão, UI, avisos
  hooks/                 atalhos de teclado, histórico, barra de menus e sincronia nativa
  components/
    ui/                  Button, Modal, Menu, Switch, Status, Facts, Icon…
    layout/              AppShell, Sidebar, Toolbar (ações contextuais por tela)
    newspaper/           NewspaperPage, Story, HalftoneImage
  features/              uma pasta por tela: onboarding, today, edition, review, print,
                         sources, preferences e command-palette
src-tauri/
  src/lib.rs             barra de menus, fechar sem encerrar, Dock, registro dos comandos
  src/feeds.rs           coleta RSS/Atom (reqwest + feed-rs) e descoberta de feed em sites
  src/ai.rs              executa o CLI de IA escolhido com o prompt
  src/scheduler.rs       agenda diária (com recuperação se o Mac estava desligado)
  src/storage.rs         edições em JSON e caminho dos PDFs
  src/pdf.rs             PDF sem diálogo (WKWebView + NSPrintOperation) e impressão com lp
  src/system.rs          impressoras (CUPS), CLIs de IA no PATH, idioma, pmset
```

## Limitações conhecidas

- "Acordar o Mac" usa `pmset repeat` e pede a senha de administrador uma vez.
- Sites sem RSS/Atom não podem ser fontes.
- A prévia no navegador (`pnpm dev`) não tem rede nem IA: os "feeds" usam conteúdo de exemplo.
