import { describe, expect, it } from "vitest";
import { cityOf, localNewsUrl } from "../sources";
import { toFeedItems } from "../../engine/generate";

describe("notícias da cidade", () => {
  it("monta o feed do Google Notícias e recupera a cidade", () => {
    const url = localNewsUrl("  Porto Alegre, RS ", "pt-BR");
    expect(url).toMatch(/^https:\/\/news\.google\.com\/rss\/search\?q=/);
    expect(url).toContain("gl=BR");
    expect(cityOf(url)).toBe("Porto Alegre, RS");
    expect(cityOf("https://g1.globo.com/rss/g1/")).toBeUndefined();
  });

  it("tira o nome do veículo do título e o resumo repetido", () => {
    const [item] = toFeedItems({
      id: "s", ok: true, error: null, resolvedUrl: null, title: null, site: null,
      items: [{ id: "1", title: "Chuva alaga ruas do Centro - GZH", summary: "<a href='x'>Chuva alaga ruas do Centro</a> GZH", url: "https://news.google.com/rss/articles/abc", published: null, image: null }],
    });
    expect(item.title).toBe("Chuva alaga ruas do Centro");
    expect(item.text).toBe("");
  });
});
