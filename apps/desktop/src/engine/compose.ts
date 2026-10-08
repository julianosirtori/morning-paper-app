// Diagramação: transforma as histórias de uma edição em páginas de jornal (capa + páginas por seção).
import type { TFunction } from "i18next";
import type { EditionDoc, EditionStory, Img, ImgKind, Lead, LayoutId, PageData, SectionKey, Story } from "../data/types";
import { clip, fold, sentences, stripPhotoCredit } from "./text";

/**
 * Histórias por página interna: poucas, para cada matéria ter texto de verdade (e não só o resumo).
 * Cada área da página tem altura fixa e recebe mais texto do que cabe:
 * o NewspaperPage (hooks/useFitPage) esconde o que sobra e corta a última matéria no fim de uma frase.
 */
export const PER_INNER_PAGE = 7;
/** Modelos das páginas internas, em rodízio: a ordem começa em um ponto diferente a cada edição. */
const INNER_LAYOUTS: LayoutId[] = ["classic", "banner", "rail", "split"];
/** Histórias que cada modelo precisa para não sobrar espaço vazio. */
const MIN_STORIES: Partial<Record<LayoutId, number>> = { banner: 4, rail: 6, split: 6 };

/** Modelo da página `i`: segue o rodízio, pulando os que pedem mais histórias do que a página tem. */
function pickLayout(i: number, n: number, count: number): LayoutId {
  for (let k = 0; k < INNER_LAYOUTS.length; k++) {
    const layout = INNER_LAYOUTS[(i + n + k) % INNER_LAYOUTS.length];
    if (count >= (MIN_STORIES[layout] ?? 0)) return layout;
  }
  return "classic";
}
const KINDS: ImgKind[] = ["field", "city", "sea", "desk"];

/** Ilustração em retícula estável para uma história sem foto. */
function kindFor(id: string): ImgKind {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return KINDS[h % KINDS.length];
}

/** Subtítulo: primeira frase do resumo, se o texto principal não começar por ela. */
function subtitle(s: EditionStory): string {
  const first = sentences(s.summary)[0] ?? "";
  const bodyStart = (s.body[0] ?? "").slice(0, 60);
  return first && !bodyStart.startsWith(first.slice(0, 40)) ? clip(first, 180) : "";
}

/**
 * Parágrafos de uma matéria até ~`max` caracteres, sempre em frases inteiras (nunca corta no meio).
 * O encaixe da página ainda pode encurtar mais, também por frases, ou trocar pelo resumo.
 */
function wholeSentences(s: EditionStory, max: number): string[] {
  const title = fold(s.title).replace(/\W+/g, " ").trim();
  // Alguns feeds repetem o título como parágrafo (sem ponto final): sai.
  const isTitle = (p: string) => fold(p).replace(/\W+/g, " ").trim() === title;
  const body = s.body.map((p, i) => (i === 0 ? stripPhotoCredit(p) : p)).filter((p) => !isTitle(p));
  const paragraphs = body.length ? body : [s.summary];
  const out: string[] = [];
  let used = 0;
  for (const p of paragraphs) {
    const kept: string[] = [];
    for (const sentence of sentences(p)) {
      if (used + sentence.length > max && (out.length || kept.length)) break;
      kept.push(sentence);
      used += sentence.length + 1;
    }
    if (kept.length) out.push(kept.join(" "));
    if (kept.length < sentences(p).length) break;
  }
  return out;
}

/** Tem texto além do título? Feeds como o Google News (notícias da cidade) trazem só a manchete. */
const hasText = (s: EditionStory) => wholeSentences(s, 200).some((p) => p.trim());

/**
 * Tira `n` histórias da fila (em ordem), preferindo as com texto (`withText`) ou as só com título.
 * Faltando das preferidas, completa com as outras.
 */
function take(queue: EditionStory[], n: number, withText: boolean): EditionStory[] {
  const picked = queue.filter((s) => hasText(s) === withText).slice(0, n);
  for (const s of queue) if (picked.length < n && !picked.includes(s)) picked.push(s);
  for (const s of picked) queue.splice(queue.indexOf(s), 1);
  return picked;
}

/** Matéria curta: título, texto em frases inteiras e o resumo como reserva para quando faltar espaço. */
const short = (s: EditionStory, max: number): Story => ({ h: s.title, p: wholeSentences(s, max), short: s.summary });

type Inner = { sections: SectionKey[]; stories: EditionStory[] };

/** Distribui as histórias (exceto a manchete) em páginas internas, agrupando por seção. */
function planInnerPages(rest: EditionStory[], innerPages: number): { pages: Inner[]; leftover: EditionStory[] } {
  const bySection = new Map<SectionKey, EditionStory[]>();
  for (const s of rest) bySection.set(s.section, [...(bySection.get(s.section) ?? []), s]);
  const order = [...bySection.entries()].sort(
    (a, b) => b[1].reduce((x, s) => x + s.score, 0) - a[1].reduce((x, s) => x + s.score, 0),
  );
  const pages: Inner[] = [];
  const placed = new Set<string>();
  for (const [section, stories] of order) {
    let page = pages[pages.length - 1];
    const room = page ? PER_INNER_PAGE - page.stories.length : 0;
    // Junta seções pequenas na mesma página ("Mundo e Negócios"); seções grandes abrem página nova.
    if (!page || room < Math.min(3, stories.length) || page.sections.length >= 2) {
      // Seção só com títulos (sem texto para a principal) não abre página: vai para a capa.
      if (pages.length >= innerPages || !stories.some(hasText)) continue;
      page = { sections: [], stories: [] };
      pages.push(page);
    }
    page.sections.push(section);
    for (const s of stories.slice(0, PER_INNER_PAGE - page.stories.length)) {
      page.stories.push(s);
      placed.add(s.id);
    }
  }
  // Página com menos de 3 histórias fica pobre: devolve para a capa. Sem nenhum texto, também.
  const kept = pages.filter((p) => p.stories.length >= 3 && p.stories.some(hasText));
  const keptIds = new Set(kept.flatMap((p) => p.stories.map((s) => s.id)));
  return { pages: kept, leftover: rest.filter((s) => !keptIds.has(s.id)) };
}

/** Páginas prontas para o NewspaperPage. `t` traduz rótulos (seções, "Em resumo"…). */
export function composeEdition(doc: EditionDoc, t: TFunction): PageData[] {
  const included = doc.stories.filter((s) => s.inc).sort((a, b) => b.score - a.score);
  if (!included.length) return [];
  // A manchete precisa de texto para encher as colunas: se a escolhida só tem título, vai a próxima com texto.
  const chosen = included.find((s) => s.head) ?? included[0];
  const head = hasText(chosen) ? chosen : (included.find(hasText) ?? chosen);
  const rest = included.filter((s) => s.id !== head.id);
  const sectionName = (k: SectionKey) => t(`sections.${k}`);

  const { pages: inner, leftover } = planInnerPages(rest, Math.max(0, doc.pageCount - 1));
  // A principal de cada página interna é a primeira com texto (as só com título ficam para as chamadas).
  for (const p of inner) p.stories.unshift(...take(p.stories, 1, true));
  const innerNames = inner.map((p) => p.sections.map(sectionName).join(t("compose.and")));

  const photo = (s: EditionStory, withIllustration = false): Img | undefined =>
    s.image
      ? { k: kindFor(s.id), src: s.image, alt: s.title, cap: t("compose.photoCredit", { source: s.sources[0] }) }
      : withIllustration
        ? { k: kindFor(s.id), alt: "", cap: "" }
        : undefined;
  /** Matéria com foto (quando o feed trouxe uma) e texto longo; o encaixe corta o excesso. */
  const story = (s: EditionStory, max: number, withPhoto: boolean, kicker = false): Story => ({
    ...short(s, max),
    kicker: kicker ? sectionName(s.section) : undefined,
    img: withPhoto ? photo(s) : undefined,
  });
  const lead = (s: EditionStory, max: number): Lead => ({
    kicker: sectionName(s.section),
    head: s.title,
    sub: subtitle(s),
    byline: t("compose.byline", { sources: s.sources.join(" · "), count: s.sources.length }),
    lead: wholeSentences(s, max),
    img: photo(s, true),
  });
  /** "Leia também": continua a coluna da principal quando o texto dela acaba antes do fim da área. */
  const fill = (stories: EditionStory[]): Story[] => stories.map((s) => ({ ...short(s, 1500), kicker: t("compose.alsoRead") }));

  // Capa: manchete, chamadas para as páginas internas, mais notícias e curtas.
  const teasers: Story[] = inner.slice(0, 4).map((p, i) => ({
    h: p.stories[0].title,
    p: `${clip(p.stories[0].summary, 160)} ${t("compose.seePage", { page: i + 2 })}`,
    img: i === 0 ? photo(p.stories[0]) : undefined,
  }));
  const pool = [...leftover];
  while (teasers.length < 4 && pool.length) teasers.push(story(pool.shift()!, 600, teasers.length === 0));
  // Sem páginas internas, a própria capa usa as notícias que iriam para dentro.
  if (!inner.length) pool.push(...rest.filter((s) => !pool.includes(s) && !teasers.some((x) => x.h === s.title)));
  const frontFill = fill(take(pool, 2, true));
  const more: Story[] = [];
  if (inner.length) more.push({ h: t("compose.inThisEdition"), list: innerNames.map((n, i) => t("compose.pageRef", { section: n, page: i + 2 })) });
  more.push(...take(pool, 4, true).map((s, i) => story(s, 1200, i % 2 === 0)));
  const toBriefs = (list: EditionStory[]) => (list.length ? list.map((s) => ({ h: sectionName(s.section), p: clip(s.title, 110) })) : undefined);
  const briefs = toBriefs(pool.splice(0, 5));

  const front: PageData = {
    section: t("compose.frontSection"),
    layout: "front",
    ...lead(head, 3000),
    fill: frontFill,
    sideLabel: t("compose.inBrief"),
    side: teasers,
    more,
    briefs,
  };

  const innerPages: PageData[] = inner.map((p, i) => {
    const layout = pickLayout(i, doc.n, p.stories.length);
    const queue = [...p.stories];
    const top = queue.shift()!;
    const base = { section: innerNames[i], layout, ...lead(top, 3000), sideLabel: t("compose.alsoIn", { section: innerNames[i] }) };
    switch (layout) {
      case "banner":
        // Foto grande; embaixo, uma faixa de matérias com foto, uma por coluna.
        return { ...base, fill: fill(take(queue, 1, true)), side: [], more: queue.splice(0, 8).map((s, k) => story(s, 1200, k < 4, true)), briefs: toBriefs(queue) };
      case "split": {
        // Duas principais lado a lado; embaixo, matérias corridas na largura toda.
        const second = lead(take(queue, 1, true)[0], 2000);
        return { ...base, fill: fill(take(queue, 1, true)), second: { ...second, fill: fill(take(queue, 1, true)) }, side: [], more: queue.map((s, k) => story(s, 1500, k % 2 === 0)) };
      }
      case "rail":
        // Coluna estreita à esquerda com chamadas e fotos pequenas; principal larga à direita.
        return { ...base, fill: fill(take(queue, 1, true)), side: take(queue, 3, false).map((s, k) => story(s, 700, k < 2)), more: queue.map((s, k) => story(s, 1500, k % 2 === 0)) };
      default:
        return { ...base, fill: fill(take(queue, 1, true)), side: take(queue, 2, false).map((s, k) => story(s, 900, k === 0)), more: queue.map((s, k) => story(s, 1500, k % 2 === 1)) };
    }
  });

  return [front, ...innerPages];
}
