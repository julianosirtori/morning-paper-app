import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/native", () => ({ fetchFeeds: vi.fn() }));
vi.mock("../../store/sources", () => {
  const state = {
    sources: [
      { id: "a", url: "https://a.com/feed", paused: false },
      { id: "b", url: "https://b.com/feed", paused: true },
      { id: "c", url: "https://c.com/feed", paused: false },
    ],
    recordFetch: vi.fn(),
  };
  return { useSources: { getState: () => state } };
});

import { fetchFeeds, type FeedResult } from "../../lib/native";
import { useSources } from "../../store/sources";
import { checkFeed, refreshSources } from "../feeds";

const result = (extra: Partial<FeedResult> = {}): FeedResult => ({
  id: "check", ok: true, error: null, resolvedUrl: null, title: null, site: null, items: [], ...extra,
});
const item = { id: "1", title: "t", summary: "", url: null, published: null, image: null };

beforeEach(() => vi.mocked(fetchFeeds).mockReset());

describe("checkFeed", () => {
  it("confere o endereço sem espaços e devolve título, site e quantidade", async () => {
    vi.mocked(fetchFeeds).mockResolvedValue([result({ resolvedUrl: "https://a.com/rss", title: "A", site: "https://a.com", items: [item, item] })]);
    expect(await checkFeed("  https://a.com  ")).toEqual({ ok: true, url: "https://a.com/rss", title: "A", site: "https://a.com", count: 2 });
    expect(fetchFeeds).toHaveBeenCalledWith([{ id: "check", url: "https://a.com" }]);
  });

  it("sem endereço resolvido usa o digitado; campos nulos viram undefined", async () => {
    vi.mocked(fetchFeeds).mockResolvedValue([result()]);
    expect(await checkFeed(" https://a.com/feed ")).toEqual({ ok: true, url: "https://a.com/feed", title: undefined, site: undefined, count: 0 });
  });

  it("devolve o erro da coleta", async () => {
    vi.mocked(fetchFeeds).mockResolvedValue([result({ ok: false, error: "não é um feed" })]);
    expect(await checkFeed("https://a.com")).toEqual({ ok: false, error: "não é um feed" });
  });

  it("resposta vazia vira erro genérico", async () => {
    vi.mocked(fetchFeeds).mockResolvedValue([]);
    expect(await checkFeed("https://a.com")).toEqual({ ok: false, error: "?" });
  });
});

describe("refreshSources", () => {
  it("lê só as fontes ativas, grava o resultado e conta sucessos e falhas", async () => {
    const results = [result({ id: "a" }), result({ id: "c", ok: false, error: "500" })];
    vi.mocked(fetchFeeds).mockResolvedValue(results);
    expect(await refreshSources()).toEqual({ ok: 1, failed: 1 });
    expect(fetchFeeds).toHaveBeenCalledWith([{ id: "a", url: "https://a.com/feed" }, { id: "c", url: "https://c.com/feed" }]);
    expect(useSources.getState().recordFetch).toHaveBeenCalledWith(results);
  });
});
