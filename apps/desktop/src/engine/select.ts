// Da coleta à pauta: transforma itens dos feeds em histórias pontuadas e escolhe as que entram na edição.
import type { EditionStory, FeedItem, Importance, Priority, SectionKey, Source, Topic } from "../data/types";
import { cluster, keywords, similarity } from "./cluster";
import { clip, sentences, stripPhotoCredit } from "./text";

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
/** Só entram notícias das últimas 36 horas (as de "ontem"). Itens sem data entram. */
const MAX_AGE_HOURS = 36;
/** Publicidade disfarçada de notícia ("Especial publicitário", "Sponsored"…) não entra. */
const SPONSORED = /^(especial publicit[aá]rio|publieditorial|conte[uú]do patrocinado|informe publicit[aá]rio|sponsored|paid content|advertorial)\b/i;

/** Quantas histórias cabem: capa (~19 contando as curtas) + páginas internas (12 cada, ver compose.ts). */
export const storyBudget = (pages: number) => 19 + Math.max(0, pages - 1) * 12;

function hoursAgo(iso: string | undefined, now: Date): number | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : (now.getTime() - t) / 3_600_000;
}

/** Une itens repetidos em histórias, com nota: prioridade da fonte, quantas fontes, quão recente, se tem imagem. */
export function buildStories(items: FeedItem[], sources: Source[], now = new Date()): EditionStory[] {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const fresh = items.filter((i) => {
    const h = hoursAgo(i.published, now);
    return i.title && !SPONSORED.test(i.title) && (h === undefined || (h >= -1 && h <= MAX_AGE_HOURS));
  });
  // Itens de fontes mais importantes primeiro: viram o "principal" do grupo.
  fresh.sort((a, b) => PRIORITY_WEIGHT[byId.get(b.sourceId)?.priority ?? "low"] - PRIORITY_WEIGHT[byId.get(a.sourceId)?.priority ?? "low"]);

  return cluster(fresh).map((group) => {
    const main = group[0];
    const src = byId.get(main.sourceId)!;
    const names = [...new Set(group.map((i) => byId.get(i.sourceId)?.name).filter(Boolean) as string[])];
    const longest = group.reduce((a, b) => (b.text.length > a.text.length ? b : a), main);
    const h = hoursAgo(main.published, now) ?? 12;
    const score =
      PRIORITY_WEIGHT[src.priority] * 10 + (names.length - 1) * 12 + Math.max(0, 24 - h) * 0.6 + (group.some((i) => i.image) ? 3 : 0);
    // `text` traz parágrafos separados por linha em branco (ver engine/generate.ts).
    const paragraphs = (longest.text || main.text).split(/\n{2,}/).filter(Boolean).map((p, i) => (i === 0 ? stripPhotoCredit(p) : p));
    const importance: Importance = score >= 40 ? "high" : score >= 25 ? "medium" : "low";
    return {
      id: main.id,
      title: main.title,
      summary: clip(paragraphs.join(" "), 260),
      body: paragraphs,
      section: src.section,
      sources: names,
      url: main.url,
      published: main.published,
      image: group.find((i) => i.image)?.image,
      importance,
      score: Math.round(score * 10) / 10,
      inc: true,
    };
  });
}

/** Abaixo disso, a edição completa com notícias já publicadas, para não sair quase vazia. */
const MIN_FRESH = 12;

/**
 * Tira as notícias que já saíram nas últimas edições (mesmo item do feed, mesmo link ou título parecido).
 * Se sobrar pouca coisa, devolve as repetidas no fim da fila, com nota menor.
 */
export function dropSeen(stories: EditionStory[], seen: Pick<EditionStory, "id" | "url" | "title">[]): EditionStory[] {
  if (!seen.length) return stories;
  const ids = new Set(seen.map((s) => s.id));
  const urls = new Set(seen.map((s) => s.url).filter(Boolean));
  const titles = seen.map((s) => keywords(s.title));
  const isSeen = (s: EditionStory) => {
    if (ids.has(s.id) || (s.url && urls.has(s.url))) return true;
    const k = keywords(s.title);
    return titles.some((t) => similarity(t, k) >= 0.6);
  };
  const fresh = stories.filter((s) => !isSeen(s));
  if (fresh.length >= MIN_FRESH) return fresh;
  return [...fresh, ...stories.filter(isSeen).map((s) => ({ ...s, score: s.score - 100 }))];
}

/**
 * Escolhe as histórias da edição respeitando o peso de cada assunto (Preferências › O que você quer ler):
 * cada seção recebe uma cota proporcional; o que sobrar é preenchido pelas de maior nota.
 */
export function selectStories(stories: EditionStory[], topics: Topic[], pages: number): EditionStory[] {
  const budget = storyBudget(pages);
  const sorted = [...stories].sort((a, b) => b.score - a.score);
  const quota = new Map<SectionKey, number>(topics.map((t) => [t.n, Math.round((t.v / 100) * budget)]));
  const chosen: EditionStory[] = [];
  const used = new Set<string>();
  for (const s of sorted) {
    const q = quota.get(s.section) ?? 0;
    if (q > 0 && chosen.length < budget) {
      chosen.push(s);
      used.add(s.id);
      quota.set(s.section, q - 1);
    }
  }
  for (const s of sorted) {
    if (chosen.length >= budget) break;
    if (!used.has(s.id) && (topics.find((t) => t.n === s.section)?.v ?? 1) > 0) chosen.push(s);
  }
  chosen.sort((a, b) => b.score - a.score);
  if (chosen[0]) chosen[0] = { ...chosen[0], head: true };
  return chosen;
}

/** Primeira frase, para o subtítulo da matéria principal. */
export const lede = (s: EditionStory) => sentences(s.summary)[0] ?? s.summary;
