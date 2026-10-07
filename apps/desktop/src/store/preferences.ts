import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_TOPICS, type EditionLang } from "../data/constants";
import type { Repeat, StyleId, Topic } from "../data/types";
import { DAILY } from "../lib/schedule";
import type { Background } from "../lib/native";

type PreferencesState = {
  style: StyleId;
  time: string;
  /** Recorrência: todos os dias, a cada N dias ou em alguns dias da semana. */
  repeat: Repeat;
  length: string;
  /** Idioma do conteúdo da edição ("auto" = igual ao do Mac). */
  editionLang: EditionLang;
  delivery: { pdf: boolean; print: boolean };
  topics: Topic[];
  background: Background;
  printerId: string | null;
  askPrinter: boolean;
  agentId: string;
  /** Primeira configuração concluída. */
  onboarded: boolean;
  /** Dia sem edição ("Pausar até amanhã"), "YYYY-MM-DD". */
  skipDate: string | null;
  set: (patch: Partial<Omit<PreferencesState, "set" | "setTopic" | "setBackground">>) => void;
  setTopic: (index: number, value: number) => void;
  setBackground: (patch: Partial<Background>) => void;
};

/** Ao mexer em um assunto, os outros se ajustam proporcionalmente para somar 100%. */
export function rebalanceTopics(topics: Topic[], i: number, v: number): Topic[] {
  const next = topics.map((t) => ({ ...t }));
  const others = next.map((_, j) => j).filter((j) => j !== i);
  const sum = others.reduce((s, j) => s + next[j].v, 0);
  const rest = 100 - v;
  others.forEach((j) => (next[j].v = sum ? Math.round((next[j].v * rest) / sum) : Math.round(rest / others.length)));
  next[i].v = v;
  // Sobra do arredondamento: um ponto por vez, começando pelos maiores
  let diff = 100 - next.reduce((s, t) => s + t.v, 0);
  const order = [...others].sort((a, b) => next[b].v - next[a].v);
  for (let k = 0; diff && k < order.length * 100; k++) {
    const j = order[k % order.length];
    const step = Math.sign(diff);
    if (next[j].v + step >= 0) {
      next[j].v += step;
      diff -= step;
    }
  }
  return next;
}

/** Preferências salvas automaticamente (sem botão "Salvar"). */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      style: "classic",
      time: "06:00",
      repeat: DAILY,
      length: "4",
      editionLang: "auto",
      delivery: { pdf: true, print: true },
      topics: DEFAULT_TOPICS,
      background: { login: true, keep: true, wake: false, menubar: true, dock: false },
      printerId: null,
      askPrinter: false,
      agentId: "claude",
      onboarded: false,
      skipDate: null,
      set: (patch) => set(patch),
      setTopic: (i, v) => set((s) => ({ topics: rebalanceTopics(s.topics, i, v) })),
      setBackground: (patch) =>
        set((s) => {
          const background = { ...s.background, ...patch };
          // Ocultar do Dock só faz sentido com o ícone na barra de menus
          if (!background.menubar) background.dock = false;
          return { background };
        }),
    }),
    {
      name: "mp-preferences-v3",
      version: 1,
      migrate: (state, version) => {
        const s = state as PreferencesState;
        // v1: assunto "Sua cidade" (local), com 10% tirados proporcionalmente dos outros
        if (version < 1 && s.topics && !s.topics.some((t) => t.n === "local")) {
          const topics = [...s.topics, { n: "local" as const, v: 0 }];
          s.topics = rebalanceTopics(topics, topics.length - 1, 10);
        }
        return s;
      },
    },
  ),
);
