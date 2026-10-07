import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/native", () => ({ fetchFeeds: vi.fn(), runAgent: vi.fn() }));

import { DEFAULT_TOPICS } from "../../data/constants";
import type { Agent, Source } from "../../data/types";
import { fetchFeeds, runAgent, type FeedRawItem, type FeedResult } from "../../lib/native";
import { generateEdition, GenerateError, localDate, toFeedItems, type GenerateInput, type Progress } from "../generate";

const src = (id: string, extra: Partial<Source> = {}): Source => ({
  id, name: id.toUpperCase(), url: `https://${id}.com/feed`, section: "world", priority: "medium", paused: false, ...extra,
});
const raw = (id: string, extra: Partial<FeedRawItem> = {}): FeedRawItem => ({
  id, title: `Título ${id}`, summary: `<p>Resumo de ${id}.</p>`, url: `https://x.com/${id}`, published: null, image: null, ...extra,
});
const feed = (id: string, items: FeedRawItem[], ok = true): FeedResult => ({
  id, ok, error: ok ? null : "falhou", resolvedUrl: null, title: null, site: null, items,
});
/** Títulos bem diferentes entre si, para não serem agrupados como a mesma notícia. */
const TITLES = ["Porto amplia ferrovia de carga", "Vacina nova chega aos postos", "Satélite mapeia geleira antártica", "Orquestra estreia no teatro municipal"];
const agent: Agent = { id: "claude", name: "Claude Code", cmd: "claude", path: "/bin/claude", found: true };
const input = (extra: Partial<GenerateInput> = {}): GenerateInput => ({
  n: 3, sources: [src("a")], topics: DEFAULT_TOPICS, pageCount: 2, style: "classic", lang: "pt-BR", agent: null, ...extra,
});

beforeEach(() => {
  vi.mocked(fetchFeeds).mockReset();
  vi.mocked(runAgent).mockReset();
});

describe("localDate", () => {
  it("formata a data local como AAAA-MM-DD com zeros", () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localDate(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });
});

describe("toFeedItems", () => {
  it("converte o HTML do feed em texto e liga à fonte", () => {
    const [i] = toFeedItems(feed("a", [raw("1", {
      title: "Título &amp; <b>negrito</b>",
      summary: `<p>Um.</p><img src="https://x.com/foto.jpg"><p>Dois.</p>`,
      published: "2026-10-07T08:00:00Z",
    })]));
    expect(i).toEqual({
      id: "1", sourceId: "a", title: "Título & negrito", text: "Um.\n\nDois.",
      url: "https://x.com/1", published: "2026-10-07T08:00:00Z", image: "https://x.com/foto.jpg",
    });
  });

  it("prefere a imagem informada pelo feed e troca null por undefined", () => {
    const [i] = toFeedItems(feed("a", [raw("1", { url: null, image: "https://x.com/capa.jpg", summary: `<img src="https://x.com/outra.jpg">` })]));
    expect(i.image).toBe("https://x.com/capa.jpg");
    expect(i.url).toBeUndefined();
    expect(i.published).toBeUndefined();
  });

  it("Google Notícias: tira o veículo do título e descarta o resumo repetido", () => {
    const [i] = toFeedItems(feed("local", [raw("1", {
      title: "Prefeitura abre - novas vagas - Jornal da Cidade",
      summary: "<a>Prefeitura abre novas vagas</a>",
      url: "https://news.google.com/rss/articles/abc",
    })]));
    expect(i.title).toBe("Prefeitura abre - novas vagas");
    expect(i.text).toBe("");
  });

  it("outros sites mantêm o hífen do título", () => {
    const [i] = toFeedItems(feed("a", [raw("1", { title: "Copa - Brasil vence" })]));
    expect(i.title).toBe("Copa - Brasil vence");
  });
});

describe("generateEdition", () => {
  const items = () => TITLES.map((title, i) => raw(String(i), { title, published: new Date(Date.now() - 3_600_000).toISOString() }));

  it("sem fontes ativas: erro noSources, sem buscar nada", async () => {
    await expect(generateEdition(input({ sources: [src("a", { paused: true })] }))).rejects.toMatchObject({ code: "noSources" });
    expect(fetchFeeds).not.toHaveBeenCalled();
  });

  it("só busca as fontes ativas", async () => {
    vi.mocked(fetchFeeds).mockResolvedValue([feed("a", items())]);
    await generateEdition(input({ sources: [src("a"), src("b", { paused: true })] }));
    expect(fetchFeeds).toHaveBeenCalledWith([{ id: "a", url: "https://a.com/feed" }]);
  });

  it("sem notícias (feeds com erro): erro noNews", async () => {
    vi.mocked(fetchFeeds).mockResolvedValue([feed("a", items(), false)]);
    const err = await generateEdition(input()).catch((e) => e);
    expect(err).toBeInstanceOf(GenerateError);
    expect(err.code).toBe("noNews");
  });

  it("monta a edição com as notícias, o registro e o progresso", async () => {
    vi.mocked(fetchFeeds).mockResolvedValue([feed("a", items())]);
    const steps: Progress["step"][] = [];
    const { doc, feeds } = await generateEdition(input({ onProgress: (p) => steps.push(p.step) }));
    expect(feeds).toHaveLength(1);
    expect(doc).toMatchObject({ version: 1, n: 3, lang: "pt-BR", pageCount: 2, style: "classic", assistant: null, aiError: undefined, date: localDate() });
    expect(doc.stories.map((s) => s.title).sort()).toEqual([...TITLES].sort());
    expect(doc.log.map((l) => l.step)).toEqual(["collected", "grouped", "built"]);
    expect(steps).toEqual(["collecting", "grouping", "building"]);
    expect(runAgent).not.toHaveBeenCalled();
  });

  it("não repete notícias já publicadas quando há novas suficientes", async () => {
    const WORDS = "porto ferrovia vacina eleição satélite museu colheita ponte orquestra reator floresta biblioteca fronteira estádio mercado teatro geleira usina vulcão cometa".split(" ");
    const unique = (i: number) => `${WORDS[i % 20]} ${WORDS[(i * 7 + 3) % 20]}${i} ${WORDS[(i * 3 + 11) % 20]}x${i}`;
    const published = new Date(Date.now() - 3_600_000).toISOString();
    const many = Array.from({ length: 16 }, (_, i) => raw(String(i), { title: unique(i), published }));
    vi.mocked(fetchFeeds).mockResolvedValue([feed("a", many)]);
    const { doc } = await generateEdition(input({ seen: [{ id: "x", url: "https://x.com/0", title: "outra coisa" }] }));
    expect(doc.stories.length).toBeGreaterThan(0);
    expect(doc.stories.map((s) => s.url)).not.toContain("https://x.com/0");
  });

  it("usa o texto da IA quando o assistente responde", async () => {
    vi.mocked(fetchFeeds).mockResolvedValue([feed("a", items())]);
    vi.mocked(runAgent).mockImplementation(async (_id, _path, prompt) => {
      // A última linha do pedido é o JSON com as notícias.
      const [{ id }] = JSON.parse(prompt.split("\n").at(-1)!) as { id: string }[];
      return `Aqui está: {"headline": "${id}", "stories": [{"id": "${id}", "title": "Título da IA"}]}`;
    });
    const steps: Progress[] = [];
    const { doc } = await generateEdition(input({ agent, onProgress: (p) => steps.push(p) }));
    expect(runAgent).toHaveBeenCalledWith("claude", "/bin/claude", expect.any(String));
    expect(doc.assistant).toBe("Claude Code");
    expect(doc.stories.find((s) => s.head)?.title).toBe("Título da IA");
    expect(steps).toContainEqual({ step: "summarizing", assistant: "Claude Code" });
    expect(doc.log.map((l) => l.step)).toContain("summarized");
  });

  it("se a IA falha, sai com o texto das fontes e guarda o erro", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(fetchFeeds).mockResolvedValue([feed("a", items())]);
    vi.mocked(runAgent).mockRejectedValue(new Error("timeout"));
    const { doc } = await generateEdition(input({ agent }));
    expect(doc.assistant).toBeNull();
    expect(doc.aiError).toBe("timeout");
    expect(doc.stories).toHaveLength(TITLES.length);
  });

  it("assistente sem caminho (não instalado) não é chamado", async () => {
    vi.mocked(fetchFeeds).mockResolvedValue([feed("a", items())]);
    await generateEdition(input({ agent: { ...agent, path: null } }));
    expect(runAgent).not.toHaveBeenCalled();
  });
});
