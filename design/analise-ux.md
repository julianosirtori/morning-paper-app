# Morning Paper: análise de UX/UI e redesenho

Este documento analisa a versão 5 do protótipo (`index.html`) e registra as decisões aplicadas no redesenho. As boas práticas usadas como base foram pesquisadas em: Apple Human Interface Guidelines (barra de ferramentas e menu lateral), WCAG 2.2, guias de botões de design systems (Visma, eBay) e guias de tipografia editorial (ProPublica).

---

## 1. Diagnóstico

### Críticos: atrapalhavam entender e usar o app

| # | Problema | Por que importa | Correção aplicada |
|---|---|---|---|
| 1 | `body{filter:grayscale(1)}` e `--red:#111` deixaram **a interface inteira** cinza | O pedido de economizar tinta valia para o jornal impresso. Na interface, o rótulo acima do título, o foco, o item ativo do menu e o botão principal ficaram com o mesmo preto, e a hierarquia sumiu | Filtro removido. A interface volta a ter **um único destaque vermelho** (`--accent:#a8322a`), usado só no rótulo acima do título, no foco e em alertas. Cada página do jornal continua **estritamente em preto e branco** |
| 2 | Várias ações principais por tela: dois "Imprimir" pretos em Hoje e dois em Imprimir, "Revisar" repetido | Quando tudo se destaca, nada se destaca: o usuário não sabe qual é o próximo passo | **Uma ação principal por tela**, sempre na barra de ferramentas. Os botões secundários têm contorno, e as ações de texto são sublinhadas |
| 3 | Com o mouse em cima, o botão secundário ficava preto, igual ao principal | Confunde a hierarquia no momento da decisão | O botão secundário só ganha um fundo levemente mais escuro com o mouse em cima |
| 4 | A tela Fontes mostrava a lista e, ao mesmo tempo, a mensagem de lista vazia "Seu primeiro jornal", além de uma linha dupla sob o cabeçalho | Mensagens contraditórias | A mensagem de lista vazia só aparece quando não há fontes. A linha dupla foi removida |
| 5 | A tabela de fontes não tinha cabeçalho, e o status quebrava em duas linhas | "Alta" e "Mundo" sem contexto | A tabela agora tem cabeçalho (Fonte, Seção, Situação, Artigos hoje, Prioridade). A situação aparece em texto com ícone, sem depender só da cor |
| 6 | Imprimir não estava no menu lateral, Edições e Fontes usavam o mesmo ícone e os ícones eram caracteres de texto | O usuário se perdia ao entrar em Imprimir | Menu com 6 destinos, ícones SVG do mesmo estilo e destino ativo sempre marcado. O botão voltar do navegador também funciona |
| 7 | Controles sem efeito: miniaturas, zoom, anterior/próxima, PDF, RSS, "···", incluir/excluir, histórico, ⌘K | Botão que não responde ensina o usuário a desconfiar da interface | Todos funcionam (ver seção 3) |

### Importantes

| # | Problema | Correção |
|---|---|---|
| 8 | Inglês misturado ("Tuesday, October 7", "Edition #142", "Classic") | Tudo em pt-BR, inclusive os estilos (Clássico, Moderno, Financeiro, Minimalista) |
| 9 | Texto da interface com 9 a 10px, texto do jornal com 8 a 10px e a data repetida 4 vezes | Texto de leitura com 16px e rótulos com no mínimo 12px. O tamanho do jornal acompanha a largura da página (unidades `cqi`), com zoom de 70% a 150%. A data aparece uma vez por tela |
| 10 | Formulário sem rótulos ligados aos campos, placeholder fazendo papel de rótulo, sem campo Prioridade e "×" que enviava o formulário | Rótulos visíveis e ligados aos campos, obrigatórios marcados, validação ao sair do campo com mensagem logo abaixo e resumo dos erros no topo. "×" e Cancelar só fecham |
| 11 | Assuntos: só 3 controles, porcentagem que não acompanhava o movimento e soma que não fechava | 7 assuntos com porcentagem ao vivo. Ao mexer em um, os outros se ajustam e o total fica sempre em 100% |
| 12 | A linha do tempo da madrugada (a "mágica" do produto) tinha sido cortada | Voltou em Hoje, como "Enquanto você dormia": 05:30 coleta → 06:01 impressão |
| 13 | Imagens eram gradientes abstratos | Ilustrações em retícula (meio-tom) em preto e branco, com legenda, como num jornal impresso |
| 14 | CSS em linhas únicas, com ajustes colados por cima de regras antigas | CSS reorganizado por seções, com cores, tamanhos de texto, espaçamentos e duração das animações definidos em um só lugar |

---

## 2. Princípios usados

- **Uma ação principal por tela.** O destaque é relativo: se dez elementos têm o mesmo peso, nenhum se destaca.
- **Barra de ferramentas contextual** (Apple HIG): mostra só as ações da tela atual. O menu lateral serve para navegar entre áreas, e o item ativo fica sempre visível.
- **WCAG 2.2 AA:**
  - Contraste de pelo menos 4,5:1 para texto e 3:1 para foco e bordas.
  - Foco visível em todos os controles.
  - Área de clique de pelo menos 24×24px (44px no celular).
  - Status nunca indicado só pela cor.
- **Tipografia editorial:** linhas de 45 a 75 caracteres (`max-width:62ch`), serifa para títulos e conteúdo, sem serifa para navegação e informações auxiliares. A hierarquia vem do tamanho, do peso e do espaço, não de caixas.
- **Configure uma vez, leia todos os dias:** preferências salvas automaticamente, sem botão "Salvar". A linha do tempo mostra o que acontece sem que o usuário precise fazer nada.

---

## 3. O que funciona no protótipo

- **Navegação:** menu lateral, link direto por endereço (`#hoje`, `#edicao`…) e botão voltar do navegador. Atalhos: ⌘K abre os comandos, ⌘P vai para Imprimir e ⌘, abre Preferências.
- **Hoje:** capa no estilo escolhido, dados da edição, linha do tempo da madrugada e link para alterar o horário.
- **Edição:** miniaturas, anterior/próxima, setas ← → do teclado, zoom e edições anteriores (abertas a partir de Imprimir).
- **Revisar:**
  - Tirar ou colocar notícias de volta, com o contador atualizado no menu e na barra de ferramentas.
  - Editar o resumo.
  - Virar manchete: a capa muda.
  - Mudar de seção.
  - A manchete não pode ser tirada da edição.
- **Imprimir:**
  - Cópias (1 a 5) e escolha entre todas as páginas ou só a capa.
  - Envio com estado "Enviando…".
  - Se a impressora estiver desligada, aparece um erro com o caminho para escolher outra. Com "Salvar como PDF", o arquivo vai para Downloads.
- **Fontes:**
  - Menu de cada linha: prioridade, pausar/retomar, abrir site e remover com confirmação.
  - Importação real de arquivo OPML.
  - Adicionar fonte com validação.
  - Mensagem de lista vazia quando não há nenhuma fonte.
- **Preferências:**
  - Horário (atualiza Hoje e a barra de menus).
  - Tamanho da edição.
  - Impressora padrão.
  - Assuntos somando 100%.
  - Estilo do jornal (muda a capa na hora).
  - Opções de segundo plano e barra de menus, preservadas da versão anterior.
  - Avançado: idioma, provedor de IA e chave da API, guardados em um painel recolhível.

---

## 4. Suposições e pontos em aberto

- O preto e branco vale **só** para o que é impresso. Se a interface também deve ser monocromática, basta trocar `--accent` e `--ok` por `--ink`.
- O fundo papel `#f7f6f3` e a fonte Georgia foram mantidos da versão anterior, com o fundo um pouco mais neutro. Uma fonte serifada própria (por exemplo, Source Serif) daria mais personalidade, mas precisaria ser incluída no app.
- As notícias e as ilustrações são de exemplo. Os nomes de fontes (Reuters, g1, BBC News Brasil…) são reais, e os links apontam para as páginas iniciais dos sites, não para matérias inventadas.
- Imprimir, PDF e a busca por impressoras são simulados no protótipo, porque o navegador não tem acesso à impressora do Mac.
