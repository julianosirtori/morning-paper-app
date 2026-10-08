// Tipos do domínio do Morning Paper. Valores guardados no estado são chaves estáveis
// (ex.: "world", "high"); o texto exibido vem das traduções em src/i18n/locales.

export type StyleId = "classic" | "modern" | "financial" | "minimal";
export type SectionKey = "world" | "brazil" | "business" | "tech" | "science" | "culture" | "sports" | "local";
export type Priority = "high" | "medium" | "low";
export type Importance = Priority;

export type ImgKind = "field" | "city" | "sea" | "desk";
/** `src` = foto do feed (impressa em P&B); sem `src`, usa a ilustração em retícula `k`. */
export type Img = { k: ImgKind; src?: string; alt: string; cap: string };
/** `short`: resumo completo de 1–2 frases, usado quando o texto não cabe (ver hooks/useFitPage). */
export type Story = { h: string; p?: string | string[]; short?: string; list?: string[]; kicker?: string; img?: Img };
/** Diagramas: a capa e quatro modelos de página interna, alternados para as páginas não ficarem iguais. */
export type LayoutId = "front" | "classic" | "banner" | "split" | "rail";
/** Matéria principal de uma página. */
export type Lead = {
  kicker: string;
  head: string;
  sub: string;
  byline: string;
  lead: string[];
  img?: Img;
  /** Matérias que continuam o texto da principal quando ele é curto ("Leia também"). */
  fill?: Story[];
};
/** Página pronta para diagramar (gerada por engine/compose a partir de uma EditionDoc). */
export type PageData = Lead & {
  section: string;
  /** Sem `layout`: "front" na capa e "classic" nas demais. */
  layout?: LayoutId;
  /** Segunda matéria principal (diagrama "split"). */
  second?: Lead;
  sideLabel: string;
  side: Story[];
  more: Story[];
  briefs?: { h: string; p: string }[];
};

export type SourceStatus = "ok" | "new" | "paused" | "error";
export type Source = {
  id: string;
  name: string;
  url: string;
  section: SectionKey;
  priority: Priority;
  paused: boolean;
  /** Página inicial informada pelo feed. */
  site?: string;
  /** Resultado da última coleta. */
  last?: { at: string; ok: boolean; count: number; error?: string };
};

/** Notícia vinda de um feed, já em texto puro. */
export type FeedItem = {
  id: string;
  sourceId: string;
  title: string;
  text: string;
  url?: string;
  published?: string;
  image?: string;
};

/** Uma história da edição: uma notícia (ou várias fontes contando a mesma notícia). */
export type EditionStory = {
  id: string;
  title: string;
  /** Resumo curto (1–2 frases). */
  summary: string;
  /** Texto mais longo para as matérias principais (resumo da IA ou texto do feed). */
  body: string[];
  section: SectionKey;
  /** Fontes que publicaram a notícia (a primeira é a principal). */
  sources: string[];
  url?: string;
  published?: string;
  image?: string;
  importance: Importance;
  score: number;
  inc: boolean;
  head?: boolean;
};

export type EditionStep = "collected" | "grouped" | "summarized" | "built" | "pdf" | "sent";

/** Edição gerada e salva em disco. As páginas são diagramadas na hora a partir das histórias. */
export type EditionDoc = {
  version: 1;
  n: number;
  /** Dia da edição, "YYYY-MM-DD". */
  date: string;
  createdAt: string;
  lang: string;
  pageCount: number;
  style: StyleId;
  stories: EditionStory[];
  /** Nome do assistente que resumiu, ou null (sem IA / falhou). */
  assistant: string | null;
  aiError?: string;
  log: { step: EditionStep; at: string; startedAt?: string; detail?: string }[];
};

/** Conteúdo de exemplo (usado na apresentação do onboarding). */
export type EditionContent = { pages: PageData[] };

export type Topic = { n: SectionKey; v: number };

/**
 * Quando sai a edição. `every`: intervalo em dias (modo "interval"), contado a partir de `from` ("YYYY-MM-DD").
 * `days`: dias da semana (0 = domingo) no modo "weekdays".
 */
export type Repeat = { mode: "daily" | "interval" | "weekdays"; every: number; days: number[]; from: string };

export type PrinterStatus = "ready" | "printing" | "offline" | "pdf";
export type Connection = "usb" | "network" | "local";
export type Printer = { id: string; name: string; info?: string; connection?: Connection; status: PrinterStatus };
export type Agent = { id: string; name: string; cmd: string | null; path: string | null; found: boolean };
