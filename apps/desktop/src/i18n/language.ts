export const LANGUAGES = ["pt-BR", "en"] as const;
export type AppLanguage = (typeof LANGUAGES)[number];

/** Qualquer variante de português usa pt-BR; o resto, inglês. */
export function resolveLanguage(tag: string | undefined): AppLanguage {
  return tag?.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}
