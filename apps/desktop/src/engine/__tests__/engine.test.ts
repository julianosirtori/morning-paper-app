import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import type { EditionDoc, FeedItem, Source } from "../../data/types";
import { DEFAULT_TOPICS } from "../../data/constants";
import { clip, htmlToParagraphs, firstImage, sentences, stripPhotoCredit } from "../text";
import { cluster } from "../cluster";
import { buildStories, dropSeen, selectStories, storyBudget } from "../select";
import { composeEdition } from "../compose";
import { applyResponse, buildPrompt, parseResponse } from "../ai";

const t = ((key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key)) as unknown as TFunction;

const src = (id: string, section: Source["section"], priority: Source["priority"] = "medium"): Source => ({
  id, name: id.toUpperCase(), url: `https://${id}.com/feed`, section, priority, paused: false,
});
const now = new Date("2026-10-07T09:00:00Z");
/** Título com palavras únicas (para não serem agrupados como a mesma notícia). */
const WORDS = "porto ferrovia vacina eleição satélite museu colheita ponte orquestra reator floresta biblioteca fronteira estádio mercado teatro geleira usina vulcão cometa".split(" ");
const unique = (i: number) => `${WORDS[i % 20]} ${WORDS[(i * 7 + 3) % 20]}${i} ${WORDS[(i * 3 + 11) % 20]}x${i}`;
const item = (sourceId: string, title: string, hours = 2, extra: Partial<FeedItem> = {}): FeedItem => ({
  id: `${sourceId}-${title}`, sourceId, title, text: `${title}. Detalhes da notícia em uma frase.\n\nSegundo parágrafo.`,
  published: new Date(now.getTime() - hours * 3_600_000).toISOString(), ...extra,
});

describe("text", () => {
  it("converte HTML de feed em parágrafos limpos", () => {
    const html = `<p>Primeiro &amp; único</p><figure><img src="https://x.com/a.jpg"><figcaption>Foto</figcaption></figure><p>Segundo&nbsp;texto</p><p>Leia mais</p>`;
    expect(htmlToParagraphs(html)).toEqual(["Primeiro & único", "Segundo texto"]);
    expect(firstImage(html)).toBe("https://x.com/a.jpg");
  });
  it("tira legenda e crédito de foto colados no começo do texto", () => {
    expect(stripPhotoCredit("PM apreendeu uma pistola e munições Polícia Militar/Divulgação Um homem, de 30 anos, foi preso.")).toBe("Um homem, de 30 anos, foi preso.");
    expect(stripPhotoCredit("O vereador voltou a ser internado.")).toBe("O vereador voltou a ser internado.");
  });
  it("não termina a frase no ponto de um número", () => {
    expect(sentences("Bateria de 6.000 mAh e R$ 1,32 bi. Outra frase! Fim")).toEqual(["Bateria de 6.000 mAh e R$ 1,32 bi.", "Outra frase!", "Fim"]);
  });
  it("corta no fim da frase", () => {
    expect(clip("Uma frase curta. Outra frase bem mais longa que não cabe.", 30)).toBe("Uma frase curta.");
    expect(clip("palavras sem ponto final nenhum aqui", 20).endsWith("…")).toBe(true);
  });
});

describe("cluster", () => {
  it("junta a mesma notícia de fontes diferentes", () => {
    const groups = cluster([
      { title: "Senado aprova reforma tributária em segundo turno" },
      { title: "Reforma tributária é aprovada pelo Senado em 2º turno" },
      { title: "Chuva forte alaga ruas de São Paulo" },
    ]);
    expect(groups.map((g) => g.length)).toEqual([2, 1]);
  });
});

describe("select", () => {
  const sources = [src("a", "brazil", "high"), src("b", "brazil", "low"), src("c", "tech")];
  it("descarta notícias velhas, une repetidas e dá mais nota a fontes prioritárias e repetidas", () => {
    const stories = buildStories(
      [
        item("a", "Senado aprova reforma tributária em segundo turno"),
        item("b", "Reforma tributária é aprovada pelo Senado em segundo turno", 3, { image: "https://b.com/i.jpg" }),
        item("c", "Nova versão de sistema operacional chega aos celulares"),
        item("c", "Notícia antiga demais para entrar", 60),
      ],
      sources,
      now,
    );
    expect(stories).toHaveLength(2);
    const reform = stories.find((s) => s.sources.length === 2)!;
    expect(reform.sources).toEqual(["A", "B"]);
    expect(reform.image).toBe("https://b.com/i.jpg");
    expect(reform.score).toBeGreaterThan(stories.find((s) => s !== reform)!.score);
  });
  it("respeita o orçamento de histórias e marca a manchete", () => {
    const many = Array.from({ length: 80 }, (_, i) => item(i % 2 ? "a" : "c", unique(i), 1 + (i % 20)));
    const chosen = selectStories(buildStories(many, sources, now), DEFAULT_TOPICS, 2);
    expect(chosen.length).toBe(storyBudget(2));
    expect(chosen.filter((s) => s.head)).toHaveLength(1);
  });
});

describe("compose", () => {
  const base = (stories: EditionDoc["stories"], pageCount = 4): EditionDoc => ({
    version: 1, n: 3, date: "2026-10-07", createdAt: now.toISOString(), lang: "pt-BR", pageCount, style: "classic", stories, assistant: null, log: [],
  });
  it("monta a capa com a manchete e páginas internas por seção", () => {
    const sources = [src("a", "brazil", "high"), src("c", "tech"), src("w", "world")];
    const items = Array.from({ length: 40 }, (_, i) => item(["a", "c", "w"][i % 3], unique(i), 1 + (i % 10)));
    const stories = selectStories(buildStories(items, sources, now), DEFAULT_TOPICS, 4);
    const pages = composeEdition(base(stories), t);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.length).toBeLessThanOrEqual(4);
    expect(pages[0].head).toBe(stories.find((s) => s.head)!.title);
    expect(pages[0].section).toBe("compose.frontSection");
    // Nenhuma história aparece duas vezes como matéria principal
    const heads = pages.map((p) => p.head);
    expect(new Set(heads).size).toBe(heads.length);
  });
  it("com poucas notícias, faz só a capa", () => {
    const stories = selectStories(buildStories([item("a", "Única notícia do dia")], [src("a", "brazil")], now), DEFAULT_TOPICS, 4);
    expect(composeEdition(base(stories), t)).toHaveLength(1);
  });
  it("alterna os diagramas das páginas internas", () => {
    const sources = [src("a", "brazil", "high"), src("c", "tech"), src("w", "world")];
    const items = Array.from({ length: 60 }, (_, i) => item(["a", "c", "w"][i % 3], unique(i), 1 + (i % 10), { image: `https://x.com/${i}.jpg` }));
    const stories = selectStories(buildStories(items, sources, now), DEFAULT_TOPICS, 4);
    const pages = composeEdition(base(stories), t);
    expect(pages[0].layout).toBe("front");
    const inner = pages.slice(1).map((p) => p.layout);
    expect(new Set(inner).size).toBe(inner.length);
    // Mais fotos: além da principal, matérias menores também levam a foto do feed.
    const withPhoto = (pg: (typeof pages)[number]) => [...pg.side, ...pg.more].filter((x) => x.img).length;
    expect(pages.every((pg) => withPhoto(pg) > 0 || pg.layout === "split")).toBe(true);
  });
  it("edição vazia não tem páginas", () => {
    expect(composeEdition(base([]), t)).toEqual([]);
  });
});

describe("ai", () => {
  const stories = buildStories([item("a", "Senado aprova reforma"), item("c", "Chuva alaga cidade")], [src("a", "brazil"), src("c", "tech")], now);
  it("monta um prompt com o idioma e os ids", () => {
    const p = buildPrompt(stories, "pt-BR");
    expect(p).toContain("Brazilian Portuguese");
    for (const s of stories) expect(p).toContain(s.id);
  });
  it("aplica a resposta, ignorando campos inválidos", () => {
    const raw = "Claro! ```json\n" + JSON.stringify({
      headline: stories[1].id,
      stories: [
        { id: stories[0].id, title: "Novo título", summary: "Resumo novo.", body: ["P1", "P2"], section: "world" },
        { id: stories[1].id, section: "inexistente" },
      ],
    }) + "\n```";
    const out = applyResponse(stories, parseResponse(raw));
    expect(out[0]).toMatchObject({ title: "Novo título", summary: "Resumo novo.", body: ["P1", "P2"], section: "world", head: false });
    expect(out[1].section).toBe(stories[1].section);
    expect(out[1].head).toBe(true);
  });
  it("recusa resposta sem JSON", () => {
    expect(() => parseResponse("não consegui")).toThrow();
  });
});

describe("não repetir notícias", () => {
  const sources = [src("a", "brazil")];
  const stories = buildStories(Array.from({ length: 20 }, (_, i) => item("a", unique(i), 2, { url: `https://a.com/${i}` })), sources, now);
  it("tira as que já saíram (mesmo item, link ou título parecido)", () => {
    const seen = [
      { id: stories[0].id, title: "x", url: undefined },
      { id: "outro", title: "y", url: stories[1].url },
      { id: "outro2", title: stories[2].title, url: undefined },
    ];
    const out = dropSeen(stories, seen);
    expect(out).toHaveLength(17);
    expect(out.some((s) => [stories[0].id, stories[1].id, stories[2].id].includes(s.id))).toBe(false);
  });
  it("com pouca notícia nova, completa com as repetidas no fim", () => {
    const out = dropSeen(stories, stories.slice(0, 15));
    expect(out).toHaveLength(20);
    expect(out.slice(0, 5).every((s) => !stories.slice(0, 15).includes(s))).toBe(true);
  });
  it("não aceita publicidade", () => {
    const ads = buildStories([item("a", "Especial publicitário: como escolher uma faculdade")], sources, now);
    expect(ads).toHaveLength(0);
  });
});
