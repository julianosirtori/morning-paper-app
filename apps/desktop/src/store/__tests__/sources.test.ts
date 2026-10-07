import { beforeEach, describe, expect, it, vi } from "vitest";

// O persist do Zustand grava no localStorage, que não existe no ambiente node do Vitest.
const storage = vi.hoisted(() => {
  const data = new Map<string, string>();
  const mem = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
  // O persist usa window.localStorage.
  (globalThis as { window?: unknown }).window = { localStorage: mem };
  return mem;
});

import type { FeedResult } from "../../lib/native";
import { sourceStatus, useSources, type NewSource } from "../sources";

const novo = (url: string, name = url): NewSource => ({ name, url, section: "world", priority: "medium" });
const result = (id: string, extra: Partial<FeedResult> = {}): FeedResult => ({
  id, ok: true, error: null, resolvedUrl: null, title: null, site: null, items: [], ...extra,
});
const state = () => useSources.getState();

beforeEach(() => {
  useSources.setState({ sources: [] });
  storage.clear();
});

describe("adicionar fontes", () => {
  it("add cria a fonte com id e ativa por padrão", () => {
    const s = state().add(novo("https://a.com/feed", "A"));
    expect(s.id).toBeTruthy();
    expect(s.paused).toBe(false);
    expect(state().sources).toEqual([s]);
  });

  it("add respeita paused quando informado", () => {
    expect(state().add({ ...novo("https://a.com/feed"), paused: true }).paused).toBe(true);
  });

  it("cada fonte recebe um id diferente", () => {
    const a = state().add(novo("https://a.com/feed"));
    const b = state().add(novo("https://b.com/feed"));
    expect(a.id).not.toBe(b.id);
  });

  it("addMany ignora endereços já cadastrados (sem diferenciar caixa nem barra final)", () => {
    state().add(novo("https://a.com/feed"));
    const added = state().addMany([novo("HTTPS://A.com/feed/"), novo("https://b.com/feed")]);
    expect(added).toBe(1);
    expect(state().sources.map((s) => s.url)).toEqual(["https://a.com/feed", "https://b.com/feed"]);
  });

  it("addMany ignora repetidos dentro da própria lista, mantendo o primeiro", () => {
    const added = state().addMany([novo("https://a.com/feed", "Primeiro"), novo("https://a.com/feed//", "Segundo")]);
    expect(added).toBe(1);
    expect(state().sources.map((s) => s.name)).toEqual(["Primeiro"]);
  });

  it("addMany devolve 0 e não mexe na lista quando nada é novo", () => {
    state().add(novo("https://a.com/feed"));
    const before = state().sources;
    expect(state().addMany([novo("https://a.com/feed")])).toBe(0);
    expect(state().addMany([])).toBe(0);
    expect(state().sources).toBe(before);
  });

  it("guarda as fontes no localStorage", () => {
    state().add(novo("https://a.com/feed", "A"));
    const saved = JSON.parse(storage.getItem("mp-sources-v4")!);
    expect(saved.state.sources[0]).toMatchObject({ name: "A", url: "https://a.com/feed" });
  });
});

describe("editar e remover", () => {
  it("pausa e retoma uma fonte", () => {
    const { id } = state().add(novo("https://a.com/feed"));
    state().update(id, { paused: true });
    expect(state().sources[0].paused).toBe(true);
    state().update(id, { paused: false });
    expect(state().sources[0].paused).toBe(false);
  });

  it("muda a prioridade só da fonte indicada", () => {
    const a = state().add(novo("https://a.com/feed"));
    state().add(novo("https://b.com/feed"));
    state().update(a.id, { priority: "high" });
    expect(state().sources.map((s) => s.priority)).toEqual(["high", "medium"]);
  });

  it("remove a fonte pelo id", () => {
    const a = state().add(novo("https://a.com/feed"));
    const b = state().add(novo("https://b.com/feed"));
    state().remove(a.id);
    expect(state().sources).toEqual([b]);
    state().remove("inexistente");
    expect(state().sources).toEqual([b]);
  });
});

describe("resultado da coleta", () => {
  it("recordFetch grava situação, quantidade, endereço resolvido e site", () => {
    const a = state().add(novo("https://a.com"));
    const item = { id: "1", title: "t", summary: "", url: null, published: null, image: null };
    state().recordFetch([result(a.id, { resolvedUrl: "https://a.com/rss", site: "https://a.com/", items: [item, item] })]);
    const s = state().sources[0];
    expect(s.url).toBe("https://a.com/rss");
    expect(s.site).toBe("https://a.com/");
    expect(s.last).toMatchObject({ ok: true, count: 2, error: undefined });
    expect(Number.isNaN(Date.parse(s.last!.at))).toBe(false);
  });

  it("recordFetch registra o erro e mantém o endereço quando não há resolvido", () => {
    const a = state().add(novo("https://a.com/feed"));
    const b = state().add(novo("https://b.com/feed"));
    state().recordFetch([result(a.id, { ok: false, error: "404" })]);
    expect(state().sources[0]).toMatchObject({ url: "https://a.com/feed", last: { ok: false, count: 0, error: "404" } });
    expect(state().sources[1]).toEqual(b);
  });
});

describe("sourceStatus", () => {
  const base = { id: "x", name: "X", url: "https://x.com", section: "world" as const, priority: "medium" as const, paused: false };
  it("pausada tem precedência sobre o resultado da coleta", () => {
    expect(sourceStatus({ ...base, paused: true, last: { at: "", ok: false, count: 0 } })).toBe("paused");
  });
  it("nova, conectada ou com erro", () => {
    expect(sourceStatus(base)).toBe("new");
    expect(sourceStatus({ ...base, last: { at: "", ok: true, count: 3 } })).toBe("ok");
    expect(sourceStatus({ ...base, last: { at: "", ok: false, count: 0 } })).toBe("error");
  });
});
