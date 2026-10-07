// Prévia no navegador (pnpm dev): sem acesso à rede do Rust, os "feeds" usam o conteúdo de exemplo.
import { contentFor } from "../data/content";
import { resolveLanguage } from "../i18n/language";
import type { FeedResult } from "./native";

export function sampleFeeds(feeds: { id: string; url: string }[]): FeedResult[] {
  const { pages } = contentFor(resolveLanguage(document.documentElement.lang || navigator.language));
  const stories = pages.flatMap((p) => [
    { title: p.head, text: p.lead.map((x) => `<p>${x}</p>`).join("") },
    ...p.side.map((s) => ({ title: s.h, text: `<p>${[s.p ?? s.list ?? ""].flat().join(" ")}</p>` })),
    ...p.more.filter((s) => !s.list).map((s) => ({ title: s.h, text: `<p>${[s.p ?? ""].flat().join("</p><p>")}</p>` })),
  ]);
  return feeds.map((f, fi) => ({
    id: f.id,
    ok: true,
    error: null,
    resolvedUrl: f.url,
    title: null,
    site: null,
    items: stories
      .filter((_, i) => i % feeds.length === fi)
      .map((s, i) => ({
        id: `${f.id}-${i}`,
        title: s.title,
        summary: s.text,
        url: null,
        published: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
        image: null,
      })),
  }));
}
