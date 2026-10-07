import { create } from "zustand";
import { AGENTS, PDF_PRINTER } from "../data/system";
import type { Agent, Printer } from "../data/types";
import { detectAgents, listPrinters } from "../lib/native";
import { t } from "../i18n";
import { usePreferences } from "./preferences";
import { toast } from "./toasts";

type SystemState = {
  printers: Printer[];
  scanningPrinters: boolean;
  agentPaths: Record<string, string | null> | null;
  scanningAgents: boolean;
  scanPrinters: (opt?: { announce?: boolean }) => Promise<void>;
  scanAgents: () => Promise<void>;
};

/** O que existe neste Mac: impressoras (CUPS) e assistentes de IA de linha de comando. */
export const useSystem = create<SystemState>()((set, get) => ({
  printers: [PDF_PRINTER],
  scanningPrinters: false,
  agentPaths: null,
  scanningAgents: false,

  scanPrinters: async ({ announce = false } = {}) => {
    set({ scanningPrinters: true });
    try {
      const before = get().printers;
      const { printers, defaultId } = await listPrinters();
      set({ printers });
      const prefs = usePreferences.getState();
      if (!prefs.printerId || !printers.some((p) => p.id === prefs.printerId)) prefs.set({ printerId: defaultId ?? printers[0].id });
      if (announce) {
        const n = printers.filter((p) => !before.some((b) => b.id === p.id)).length;
        toast(n ? t("prefs.toast.printersFound", { count: n }) : t("prefs.toast.noPrinters"));
      }
    } catch (e) {
      console.error(e);
      toast(t("prefs.toast.printersFailed"), "err");
    } finally {
      set({ scanningPrinters: false });
    }
  },

  scanAgents: async () => {
    set({ scanningAgents: true });
    try {
      set({ agentPaths: await detectAgents() });
    } catch (e) {
      console.error(e);
      set({ agentPaths: {} });
    } finally {
      set({ scanningAgents: false });
    }
  },
}));

/** A opção "Salvar como PDF" tem nome traduzido; as impressoras reais usam o nome do sistema. */
export const withDisplayName = (p: Printer): Printer => (p.id === PDF_PRINTER.id ? { ...p, name: t("printer.pdfName") } : p);

/** Impressora padrão escolhida (ou a primeira disponível). */
export function usePrinter(): Printer {
  const printers = useSystem((s) => s.printers);
  const id = usePreferences((s) => s.printerId);
  return withDisplayName(printers.find((p) => p.id === id) ?? printers[0]);
}

export function resolveAgents(paths: Record<string, string | null> | null): Agent[] {
  return AGENTS.map((a) => (a.cmd ? { ...a, path: paths?.[a.id] ?? null, found: !!paths?.[a.id] } : { ...a, name: t("prefs.ai.none") }));
}

/** Assistentes com o resultado da detecção aplicado. */
export function useAgents(): Agent[] {
  const paths = useSystem((s) => s.agentPaths);
  return resolveAgents(paths);
}

function pickAgent(agents: Agent[], ready: boolean, id: string): Agent {
  const chosen = agents.find((a) => a.id === id);
  if (!ready) return chosen ?? agents[0];
  return agents.find((a) => a.id === id && a.found) ?? agents.find((a) => a.found)!;
}

/** Assistente em uso: o escolhido, se instalado; senão o primeiro encontrado (ou "Sem IA"). */
export function useActiveAgent(): Agent {
  const agents = useAgents();
  const ready = useSystem((s) => s.agentPaths !== null);
  const id = usePreferences((s) => s.agentId);
  return pickAgent(agents, ready, id);
}

/** Mesmo que useActiveAgent, fora de componentes (geração da edição). */
export function getActiveAgent(): Agent {
  const { agentPaths } = useSystem.getState();
  return pickAgent(resolveAgents(agentPaths), agentPaths !== null, usePreferences.getState().agentId);
}

/** Impressora padrão, fora de componentes. */
export function getPrinter(): Printer {
  const { printers } = useSystem.getState();
  const id = usePreferences.getState().printerId;
  return withDisplayName(printers.find((p) => p.id === id) ?? printers[0]);
}
