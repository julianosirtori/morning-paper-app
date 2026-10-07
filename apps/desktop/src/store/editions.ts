import { create } from "zustand";
import type { EditionDoc, EditionStory } from "../data/types";
import { generateEdition, GenerateError, localDate, type Progress } from "../engine/generate";
import { appLanguage, t } from "../i18n";
import { listEditionFiles, saveEditionFile } from "../lib/native";
import { usePreferences } from "./preferences";
import { useSources } from "./sources";
import { getActiveAgent } from "./system";
import { toast } from "./toasts";

export type GenerateReason = "manual" | "scheduled" | "onboarding";

type EditionsState = {
  /** Edições salvas, da mais nova para a mais antiga. */
  editions: EditionDoc[];
  loaded: boolean;
  /** Progresso da geração em andamento (null = parado). */
  progress: Progress | null;
  error: string | null;
  load: () => Promise<void>;
  /** Gera uma edição nova; devolve o documento ou null se não deu. */
  generate: (reason: GenerateReason) => Promise<EditionDoc | null>;
  save: (doc: EditionDoc) => Promise<void>;
  updateStory: (n: number, id: string, patch: Partial<EditionStory>) => void;
  makeHeadline: (n: number, id: string) => void;
};

/** Idioma do texto da edição: o escolhido em Preferências ou, em "auto", o do app. */
export const editionLang = () => {
  const l = usePreferences.getState().editionLang;
  return l === "auto" ? appLanguage() : l;
};

/** Quantos dias para trás uma notícia conta como "já publicada". */
const SEEN_DAYS = 3;

/** Notícias que entraram nas edições dos últimos dias (inclusive hoje). */
function recentStories(editions: EditionDoc[]) {
  const since = Date.now() - SEEN_DAYS * 86_400_000;
  return editions
    .filter((e) => Date.parse(e.createdAt) >= since)
    .flatMap((e) => e.stories.filter((s) => s.inc).map(({ id, url, title }) => ({ id, url, title })));
}

export const useEditions = create<EditionsState>()((set, get) => ({
  editions: [],
  loaded: false,
  progress: null,
  error: null,

  load: async () => {
    try {
      const files = await listEditionFiles();
      const editions = files.flatMap((f) => {
        try {
          return [JSON.parse(f) as EditionDoc];
        } catch {
          return [];
        }
      });
      set({ editions: editions.sort((a, b) => b.n - a.n), loaded: true });
    } catch (e) {
      console.error(e);
      set({ loaded: true });
    }
  },

  generate: async (reason) => {
    if (get().progress) return null;
    const prefs = usePreferences.getState();
    const n = (get().editions[0]?.n ?? 0) + 1;
    set({ progress: { step: "collecting", done: 0, total: 0 }, error: null });
    try {
      const { doc, feeds } = await generateEdition({
        n,
        sources: useSources.getState().sources,
        topics: prefs.topics,
        pageCount: Number(prefs.length),
        style: prefs.style,
        lang: editionLang(),
        agent: getActiveAgent(),
        seen: recentStories(get().editions),
        onProgress: (progress) => set({ progress }),
      });
      useSources.getState().recordFetch(feeds);
      await get().save(doc);
      if (doc.aiError) toast(t("generate.aiFailed", { error: doc.aiError }), "err");
      if (reason !== "scheduled") toast(t("generate.ready", { n: doc.n }));
      return doc;
    } catch (e) {
      const msg = e instanceof GenerateError ? t(`generate.error.${e.code}`) : t("generate.error.unknown", { error: String(e) });
      set({ error: msg });
      toast(msg, "err");
      return null;
    } finally {
      set({ progress: null });
    }
  },

  save: async (doc) => {
    set((s) => ({ editions: [doc, ...s.editions.filter((e) => e.n !== doc.n)].sort((a, b) => b.n - a.n) }));
    try {
      await saveEditionFile(doc.n, JSON.stringify(doc));
    } catch (e) {
      console.error(e);
      toast(t("generate.error.save"), "err");
    }
  },

  updateStory: (n, id, patch) => {
    const doc = get().editions.find((e) => e.n === n);
    if (doc) get().save({ ...doc, stories: doc.stories.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  },

  makeHeadline: (n, id) => {
    const doc = get().editions.find((e) => e.n === n);
    if (doc) get().save({ ...doc, stories: doc.stories.map((s) => ({ ...s, head: s.id === id })) });
  },
}));

/** Edição de hoje (a mais nova com a data de hoje), se já existe. */
export const useTodayEdition = () => useEditions((s) => s.editions.find((e) => e.date === localDate()) ?? null);
export const useLatestEdition = () => useEditions((s) => s.editions[0] ?? null);
