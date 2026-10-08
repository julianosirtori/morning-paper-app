// Resumo por IA: pede ao assistente de linha de comando um JSON com títulos, resumos e textos
// no idioma da edição. Se a resposta vier quebrada, a edição segue com o texto dos feeds.
import { SECTIONS } from "../data/constants";
import type { EditionStory, SectionKey } from "../data/types";
import { clip } from "./text";

const LANGUAGE_NAMES: Record<string, string> = { "pt-BR": "Brazilian Portuguese", en: "English", es: "Spanish" };
/** As primeiras abrem página: texto mais longo, para preencher as colunas da principal. */
const OPENERS = 4;
/** As seguintes viram matérias com texto corrido; as demais, notas e "Leia também". */
const LONG_FORM = 14;
const MAX_STORIES = 45;

export function buildPrompt(stories: EditionStory[], lang: string): string {
  const language = LANGUAGE_NAMES[lang] ?? "English";
  const input = stories.slice(0, MAX_STORIES).map((s, i) => ({
    id: s.id,
    title: s.title,
    sources: s.sources,
    section: s.section,
    text: clip(s.body.join(" ") || s.summary, i < OPENERS ? 4000 : i < LONG_FORM ? 2500 : 1500),
  }));
  return [
    "You are the editor of a calm, printed morning newspaper. Below are yesterday's news items as JSON.",
    `Write everything in ${language}. Be factual and neutral; use only the information given, never invent facts.`,
    "Return ONLY a JSON object, no markdown fences, with this shape:",
    '{"headline":"<id of the most important story>","stories":[{"id":"<same id>","title":"<clear headline, max 90 chars>","summary":"<1-2 sentences, max 240 chars>","body":["<paragraph>", "..."],"section":"<one of: ' +
      SECTIONS.join("|") +
      '>"}]}',
    `Include every id once. "body" has 5-6 paragraphs (about 350 words in total) for the first ${OPENERS} stories, 3-4 paragraphs (about 200 words) for stories ${OPENERS + 1} to ${LONG_FORM}, and 2-3 paragraphs (about 120 words) for all the others.`,
    "The reader wants to understand each story, not just hear about it: say what happened, who is involved, why it matters and what comes next, as far as the given text allows.",
    "Every paragraph must be made of complete sentences that read well on their own: the page may print only the first paragraph, or only the summary. Skip photo captions, credits and repeated headlines found in the text.",
    "If the given text is too short for that length, write less: never pad with invented facts.",
    "",
    JSON.stringify(input),
  ].join("\n");
}

type AiStory = { id: string; title?: string; summary?: string; body?: string[]; section?: string };
type AiResponse = { headline?: string; stories?: AiStory[] };

/** Extrai o primeiro objeto JSON da resposta (os CLIs às vezes cercam com texto ou ```). */
export function parseResponse(raw: string): AiResponse {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("resposta sem JSON");
  const data = JSON.parse(raw.slice(start, end + 1)) as AiResponse;
  if (!Array.isArray(data.stories)) throw new Error("JSON sem 'stories'");
  return data;
}

const isSection = (s: unknown): s is SectionKey => typeof s === "string" && (SECTIONS as string[]).includes(s);
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? clip(v.trim(), max) : undefined);

/** Aplica títulos, resumos, textos, seções e manchete sugeridos pela IA. Campos inválidos são ignorados. */
export function applyResponse(stories: EditionStory[], res: AiResponse): EditionStory[] {
  const byId = new Map((res.stories ?? []).map((s) => [s.id, s]));
  const out = stories.map((s) => {
    const r = byId.get(s.id);
    if (!r) return s;
    const body = Array.isArray(r.body) ? r.body.map((p) => str(p, 900)).filter((p): p is string => !!p) : [];
    return {
      ...s,
      title: str(r.title, 110) ?? s.title,
      summary: str(r.summary, 300) ?? s.summary,
      body: body.length ? body : s.body,
      section: isSection(r.section) ? r.section : s.section,
    };
  });
  if (res.headline && out.some((s) => s.id === res.headline)) {
    return out.map((s) => ({ ...s, head: s.id === res.headline }));
  }
  return out;
}
