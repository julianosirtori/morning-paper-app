import type { Priority, SectionKey, StyleId, Topic } from "./types";

export const STYLE_IDS: StyleId[] = ["classic", "modern", "financial", "minimal"];

export const SECTIONS: SectionKey[] = ["world", "brazil", "business", "tech", "science", "culture", "sports", "local"];

export const DEFAULT_TOPICS: Topic[] = [
  { n: "brazil", v: 20 }, { n: "world", v: 20 }, { n: "tech", v: 15 }, { n: "business", v: 15 },
  { n: "local", v: 10 }, { n: "science", v: 10 }, { n: "sports", v: 5 }, { n: "culture", v: 5 },
];

export const TIMES = ["05:30", "06:00", "06:30", "07:00", "07:30"];
/** Idiomas da edição (conteúdo do jornal); "auto" segue o idioma do Mac. */
export const EDITION_LANGS = ["auto", "pt-BR", "en", "es"] as const;
export type EditionLang = (typeof EDITION_LANGS)[number];
export const PAGE_LENGTHS = ["2", "4", "6", "8"];
export const PRIORITIES: Priority[] = ["high", "medium", "low"];
