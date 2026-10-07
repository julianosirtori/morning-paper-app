import { create } from "zustand";
import { PDF_PRINTER } from "../data/system";
import type { Printer } from "../data/types";
import { printEdition } from "../lib/native";
import { t } from "../i18n";
import { useEditions } from "./editions";
import { useReader } from "./reader";
import { toast } from "./toasts";

export const MAX_COPIES = 5;

/** Mensagem de resultado já traduzida; `offline` acrescenta o link "escolha outra". */
export type PrintMessage = { tone: "ok" | "err"; text: string; offline?: boolean } | null;

type PrintState = {
  copies: number;
  range: "all" | "front";
  printing: boolean;
  message: PrintMessage;
  setCopies: (n: number) => void;
  setRange: (r: "all" | "front") => void;
  /** Abre o diálogo de impressão do macOS com as páginas da edição em leitura (impressão manual). */
  print: (printer: Printer) => Promise<void>;
};

export const usePrint = create<PrintState>()((set, get) => ({
  copies: 1,
  range: "all",
  printing: false,
  message: null,

  setCopies: (n) => set({ copies: Math.max(1, Math.min(MAX_COPIES, n)) }),
  setRange: (range) => set({ range }),

  print: async (printer) => {
    if (get().printing) return;
    set({ printing: true, message: null });
    await new Promise((r) => setTimeout(r, 500));
    try {
      if (printer.status === "offline") {
        set({ message: { tone: "err", offline: true, text: t("print.msg.offline", { printer: printer.name }) } });
        toast(t("print.toast.failed"), "err");
        return;
      }
      await printEdition(printer.id === PDF_PRINTER.id ? undefined : printer);
      const { copies, range } = get();
      const { editions } = useEditions.getState();
      const viewing = useReader.getState().viewing;
      const edition = editions.find((e) => e.n === viewing) ?? editions[0];
      if (printer.id === PDF_PRINTER.id) {
        set({ message: { tone: "ok", text: t("print.msg.pdf", { n: edition?.n ?? 0 }) } });
        toast(t("print.toast.pdfOpen"));
      } else {
        const what = range === "front" ? t("print.msg.whatFront") : t("print.msg.whatAll", { count: edition?.pageCount ?? 0 });
        set({ message: { tone: "ok", text: t("print.msg.sent", { printer: printer.name, count: copies, what }) } });
        toast(t("print.toast.printing", { printer: printer.name }));
      }
    } catch (e) {
      console.error(e);
      set({ message: { tone: "err", text: t("print.msg.failed") } });
      toast(t("print.toast.failed"), "err");
    } finally {
      set({ printing: false });
    }
  },

}));
