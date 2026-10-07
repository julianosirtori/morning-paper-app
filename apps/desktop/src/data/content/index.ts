import type { AppLanguage } from "../../i18n";
import type { EditionContent } from "../types";
import ptBR from "./pt-BR";
import en from "./en";

const CONTENT: Record<AppLanguage, EditionContent> = { "pt-BR": ptBR, en };

/** Conteúdo de exemplo da edição no idioma pedido. */
export const contentFor = (lang: AppLanguage): EditionContent => CONTENT[lang];
