// Feeds sugeridos no onboarding, por idioma do app. Todos foram verificados (respondem RSS/Atom com notícias).
import type { AppLanguage } from "../i18n";
import type { Priority, SectionKey } from "./types";

export type SuggestedSource = { name: string; url: string; section: SectionKey; priority: Priority; recommended?: boolean };

export const SUGGESTED_SOURCES: Record<AppLanguage, SuggestedSource[]> = {
  "pt-BR": [
    { name: "g1", url: "https://g1.globo.com/rss/g1/", section: "brazil", priority: "high", recommended: true },
    { name: "BBC News Brasil", url: "https://feeds.bbci.co.uk/portuguese/rss.xml", section: "world", priority: "high", recommended: true },
    { name: "Agência Brasil", url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml", section: "brazil", priority: "medium", recommended: true },
    { name: "Estadão", url: "https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/ultimas/", section: "brazil", priority: "medium" },
    { name: "CNN Brasil", url: "https://www.cnnbrasil.com.br/feed/", section: "brazil", priority: "medium" },
    { name: "Nexo Jornal", url: "https://www.nexojornal.com.br/rss.xml", section: "brazil", priority: "medium", recommended: true },
    { name: "InfoMoney", url: "https://www.infomoney.com.br/feed/", section: "business", priority: "medium" },
    { name: "Tecnoblog", url: "https://tecnoblog.net/feed/", section: "tech", priority: "medium", recommended: true },
    { name: "Revista Pesquisa FAPESP", url: "https://revistapesquisa.fapesp.br/feed/", section: "science", priority: "low" },
    { name: "ge", url: "https://ge.globo.com/rss/ge/", section: "sports", priority: "low" },
    { name: "The Guardian (Cultura)", url: "https://www.theguardian.com/culture/rss", section: "culture", priority: "low" },
  ],
  en: [
    { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", section: "world", priority: "high", recommended: true },
    { name: "The Guardian — World", url: "https://www.theguardian.com/world/rss", section: "world", priority: "high", recommended: true },
    { name: "The New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", section: "world", priority: "medium" },
    { name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml", section: "world", priority: "medium", recommended: true },
    { name: "The Guardian — Business", url: "https://www.theguardian.com/business/rss", section: "business", priority: "medium" },
    { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", section: "tech", priority: "medium", recommended: true },
    { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", section: "tech", priority: "low" },
    { name: "Hacker News", url: "https://hnrss.org/frontpage", section: "tech", priority: "low" },
    { name: "ScienceDaily", url: "https://www.sciencedaily.com/rss/all.xml", section: "science", priority: "low", recommended: true },
    { name: "NASA", url: "https://www.nasa.gov/feed/", section: "science", priority: "low" },
    { name: "ESPN", url: "https://www.espn.com/espn/rss/news", section: "sports", priority: "low" },
    { name: "The Guardian — Culture", url: "https://www.theguardian.com/culture/rss", section: "culture", priority: "low" },
  ],
};

/** Página inicial de uma fonte (origem do endereço do feed). */
export function siteOf(url: string): string | undefined {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return undefined;
  }
}

/** Região do Google Notícias por idioma da edição (define o idioma e o país dos resultados). */
const NEWS_REGION: Record<string, string> = {
  "pt-BR": "hl=pt-BR&gl=BR&ceid=BR:pt-419",
  en: "hl=en-US&gl=US&ceid=US:en",
  es: "hl=es-419&gl=US&ceid=US:es-419",
};

/**
 * Feed RSS com as notícias sobre uma cidade, reunidas pelo Google Notícias a partir dos sites locais.
 * `when:2d` limita às últimas 48 horas.
 */
export function localNewsUrl(city: string, lang: string): string {
  const q = encodeURIComponent(`"${city.trim().replace(/"/g, "")}" when:2d`);
  return `https://news.google.com/rss/search?q=${q}&${NEWS_REGION[lang] ?? NEWS_REGION.en}`;
}

/** Cidade de uma fonte criada por `localNewsUrl` (ou undefined). */
export function cityOf(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (u.hostname !== "news.google.com") return undefined;
    return u.searchParams.get("q")?.match(/^"([^"]+)"/)?.[1];
  } catch {
    return undefined;
  }
}
