import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Source } from "../data/types";
import type { FeedResult } from "../lib/native";

export type NewSource = Omit<Source, "id" | "paused"> & { paused?: boolean };

type SourcesState = {
  sources: Source[];
  add: (s: NewSource) => Source;
  addMany: (list: NewSource[]) => number;
  update: (id: string, patch: Partial<Source>) => void;
  remove: (id: string) => void;
  /** Guarda o resultado da coleta em cada fonte (situação, quantidade, página inicial). */
  recordFetch: (results: FeedResult[]) => void;
};

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const sameUrl = (a: string, b: string) => a.replace(/\/+$/, "").toLowerCase() === b.replace(/\/+$/, "").toLowerCase();

export const useSources = create<SourcesState>()(
  persist(
    (set, get) => ({
      sources: [],
      add: (s) => {
        const source: Source = { ...s, id: newId(), paused: s.paused ?? false };
        set((st) => ({ sources: [...st.sources, source] }));
        return source;
      },
      /** Adiciona várias fontes (onboarding, OPML), ignorando endereços repetidos. */
      addMany: (list) => {
        const current = get().sources;
        const fresh = list.filter((s, i) => !current.some((c) => sameUrl(c.url, s.url)) && list.findIndex((x) => sameUrl(x.url, s.url)) === i);
        if (fresh.length) set({ sources: [...current, ...fresh.map((s) => ({ ...s, id: newId(), paused: s.paused ?? false }))] });
        return fresh.length;
      },
      update: (id, patch) => set((st) => ({ sources: st.sources.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),
      remove: (id) => set((st) => ({ sources: st.sources.filter((s) => s.id !== id) })),
      recordFetch: (results) => {
        const at = new Date().toISOString();
        const byId = new Map(results.map((r) => [r.id, r]));
        set((st) => ({
          sources: st.sources.map((s) => {
            const r = byId.get(s.id);
            if (!r) return s;
            return {
              ...s,
              url: r.resolvedUrl ?? s.url,
              site: r.site ?? s.site,
              last: { at, ok: r.ok, count: r.items.length, error: r.error ?? undefined },
            };
          }),
        }));
      },
    }),
    { name: "mp-sources-v4" },
  ),
);

export const useActiveSourceCount = () => useSources((s) => s.sources.filter((x) => !x.paused).length);

/** Situação exibida: pausada, ainda não lida, conectada ou com erro. */
export const sourceStatus = (s: Source) => (s.paused ? "paused" : !s.last ? "new" : s.last.ok ? "ok" : "error");
