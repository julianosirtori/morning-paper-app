// Gera uma edição: coleta os feeds, agrupa repetições, escolhe a pauta, resume com IA (opcional) e monta o documento.
import type { Agent, EditionDoc, EditionStory, EditionStep, FeedItem, Source, StyleId, Topic } from "../data/types";
import { fetchFeeds, runAgent, type FeedResult } from "../lib/native";
import { applyResponse, buildPrompt, parseResponse } from "./ai";
import { buildStories, dropSeen, selectStories } from "./select";
import { firstImage, htmlToParagraphs } from "./text";

export type Progress =
  | { step: "collecting"; done: number; total: number }
  | { step: "grouping" }
  | { step: "summarizing"; assistant: string }
  | { step: "building" };

export class GenerateError extends Error {
  constructor(public code: "noSources" | "noNews", message?: string) {
    super(message ?? code);
  }
}

export type GenerateInput = {
  n: number;
  sources: Source[];
  topics: Topic[];
  pageCount: number;
  style: StyleId;
  /** Idioma do texto da edição (para a IA). */
  lang: string;
  agent: Agent | null;
  /** Notícias das últimas edições, para não repetir. */
  seen?: Pick<EditionStory, "id" | "url" | "title">[];
  onProgress?: (p: Progress) => void;
};

export type GenerateOutput = { doc: EditionDoc; feeds: FeedResult[] };

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export { localDate };

/** Google Notícias (notícias da cidade): o título vem como "Manchete - Veículo" e o resumo só repete a manchete. */
const GOOGLE_NEWS = /^https:\/\/news\.google\.com\//;
const withoutOutlet = (title: string) => title.replace(/\s+-\s+[^-]+$/, "");

/** Converte um item do feed (HTML) em texto puro, com parágrafos separados por linha em branco. */
export function toFeedItems(result: FeedResult): FeedItem[] {
  return result.items.map((i) => {
    const title = htmlToParagraphs(i.title).join(" ");
    const google = GOOGLE_NEWS.test(i.url ?? "");
    return {
      id: i.id,
      sourceId: result.id,
      title: google ? withoutOutlet(title) : title,
      text: google ? "" : htmlToParagraphs(i.summary).join("\n\n"),
      url: i.url ?? undefined,
      published: i.published ?? undefined,
      image: i.image ?? firstImage(i.summary),
    };
  });
}

export async function generateEdition(input: GenerateInput): Promise<GenerateOutput> {
  const { onProgress = () => {} } = input;
  const active = input.sources.filter((s) => !s.paused);
  if (!active.length) throw new GenerateError("noSources");
  const log: EditionDoc["log"] = [];
  const mark = (step: EditionStep, detail?: string) => log.push({ step, at: new Date().toISOString(), detail });

  onProgress({ step: "collecting", done: 0, total: active.length });
  const feeds = await fetchFeeds(active.map((s) => ({ id: s.id, url: s.url })));
  const items = feeds.filter((f) => f.ok).flatMap(toFeedItems);
  mark("collected", String(feeds.filter((f) => f.ok).length));

  onProgress({ step: "grouping" });
  const built = buildStories(items, active);
  const all = dropSeen(built, input.seen ?? []);
  let stories = selectStories(all, input.topics, input.pageCount);
  if (!stories.length) throw new GenerateError("noNews");
  mark("grouped", String(items.length - built.length));

  let assistant: string | null = null;
  let aiError: string | undefined;
  if (input.agent?.cmd && input.agent.path) {
    onProgress({ step: "summarizing", assistant: input.agent.name });
    try {
      const raw = await runAgent(input.agent.id, input.agent.path, buildPrompt(stories, input.lang));
      stories = applyResponse(stories, parseResponse(raw));
      assistant = input.agent.name;
      mark("summarized", assistant);
    } catch (e) {
      aiError = e instanceof Error ? e.message : String(e);
      console.warn("IA falhou; seguindo com o texto dos feeds:", aiError);
    }
  }

  onProgress({ step: "building" });
  mark("built");
  const doc: EditionDoc = {
    version: 1,
    n: input.n,
    date: localDate(),
    createdAt: new Date().toISOString(),
    lang: input.lang,
    pageCount: input.pageCount,
    style: input.style,
    stories,
    assistant,
    aiError,
    log,
  };
  return { doc, feeds };
}
