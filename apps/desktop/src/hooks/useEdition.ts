import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { EditionDoc, PageData } from "../data/types";
import { composeEdition } from "../engine/compose";
import { useEditions } from "../store/editions";
import { useReader } from "../store/reader";

/** Edição aberta na tela Edição (ou a mais recente). */
export function useViewedEdition(): EditionDoc | null {
  const viewing = useReader((s) => s.viewing);
  return useEditions((s) => (viewing == null ? null : s.editions.find((e) => e.n === viewing)) ?? s.editions[0] ?? null);
}

/** Páginas diagramadas de uma edição (recalcula quando a edição muda). */
export function usePages(doc: EditionDoc | null): PageData[] {
  const { t } = useTranslation();
  return useMemo(() => (doc ? composeEdition(doc, t) : []), [doc, t]);
}
