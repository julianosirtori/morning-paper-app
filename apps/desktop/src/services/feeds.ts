import { fetchFeeds } from "../lib/native";

export type FeedCheck =
  | { ok: true; url: string; title?: string; site?: string; count: number }
  | { ok: false; error: string };

/** Confere se o endereço é um feed (ou um site com feed anunciado) e devolve o título e quantas notícias tem. */
export async function checkFeed(url: string): Promise<FeedCheck> {
  const [r] = await fetchFeeds([{ id: "check", url: url.trim() }]);
  if (!r?.ok) return { ok: false, error: r?.error ?? "?" };
  return { ok: true, url: r.resolvedUrl ?? url.trim(), title: r.title ?? undefined, site: r.site ?? undefined, count: r.items.length };
}

/** Lê todas as fontes ativas agora e atualiza a situação de cada uma (sem gerar edição). */
export async function refreshSources(): Promise<{ ok: number; failed: number }> {
  const { useSources } = await import("../store/sources");
  const active = useSources.getState().sources.filter((s) => !s.paused);
  const results = await fetchFeeds(active.map((s) => ({ id: s.id, url: s.url })));
  useSources.getState().recordFetch(results);
  return { ok: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length };
}
