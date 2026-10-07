import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ptBR from "./locales/pt-BR.json";
import en from "./locales/en.json";
import { systemLocale } from "../lib/native";

import { resolveLanguage, type AppLanguage } from "./language";

export { LANGUAGES, resolveLanguage, type AppLanguage } from "./language";

export const resources = {
  "pt-BR": { translation: ptBR },
  en: { translation: en },
} as const;

/** Inicia as traduções no idioma do sistema operacional. */
export async function initI18n(): Promise<AppLanguage> {
  const lng = resolveLanguage(await systemLocale());
  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false }, // o React já escapa
    returnNull: false,
  });
  document.documentElement.lang = lng;
  return lng;
}

export const appLanguage = () => resolveLanguage(i18n.language);
export const t = i18n.t.bind(i18n);
export default i18n;
