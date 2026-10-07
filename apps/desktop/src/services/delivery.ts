// Entrega da manhã: depois de gerar a edição agendada, salva o PDF e manda para a impressora, sem diálogos.
import type { EditionDoc } from "../data/types";
import { PDF_PRINTER } from "../data/system";
import { t } from "../i18n";
import { exportPdf, isTauri, notify, pdfPath, printEdition, printPdf, revealInFinder, showMainWindow } from "../lib/native";
import { useEditions } from "../store/editions";
import { useNavigation } from "../store/navigation";
import { usePreferences } from "../store/preferences";
import { usePrint } from "../store/print";
import { useReader } from "../store/reader";
import { getPrinter } from "../store/system";
import { toast } from "../store/toasts";

/** Imprime sozinho só se a edição saiu perto do horário (não às 15h porque o Mac estava desligado). */
const MAX_LATE_TO_PRINT = 120;

const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

/** Espera o React desenhar as folhas de impressão e as fotos carregarem (no máximo 10 s). */
export async function waitForPrintSheets() {
  await frame();
  await frame();
  const imgs = [...document.querySelectorAll<HTMLImageElement>(".print-root img")];
  await Promise.race([
    Promise.all(
      imgs.map((img) =>
        img.complete
          ? null
          : new Promise((r) => {
              img.addEventListener("load", r, { once: true });
              img.addEventListener("error", r, { once: true });
            }),
      ),
    ),
    new Promise((r) => setTimeout(r, 10_000)),
  ]);
}

/** Gera o PDF da edição em ~/Documents/Morning Paper e devolve o caminho. */
export async function savePdfOf(doc: EditionDoc): Promise<string> {
  useReader.getState().open(doc.n);
  usePrint.getState().setRange("all");
  await waitForPrintSheets();
  const path = await pdfPath(`morning-paper-${doc.n}.pdf`);
  await exportPdf(path);
  return path;
}

export async function deliver(doc: EditionDoc, lateMinutes: number) {
  const prefs = usePreferences.getState();
  const printer = getPrinter();
  const log = [...doc.log];
  const shouldPrint = prefs.delivery.print && lateMinutes <= MAX_LATE_TO_PRINT;
  let path: string | undefined;

  try {
    if (prefs.delivery.pdf || shouldPrint) {
      path = await savePdfOf(doc);
      log.push({ step: "pdf", at: new Date().toISOString(), detail: path });
    }
    if (shouldPrint && path) {
      if (prefs.askPrinter) {
        await showMainWindow();
        useNavigation.getState().go("imprimir");
        await printEdition(printer.id === PDF_PRINTER.id ? undefined : printer);
      } else if (printer.id !== PDF_PRINTER.id && printer.status !== "offline") {
        await printPdf(path, printer.id, usePrint.getState().copies);
        log.push({ step: "sent", at: new Date().toISOString(), detail: printer.name });
      }
    }
    await notify(t("delivery.title", { n: doc.n }), log.some((l) => l.step === "sent") ? t("delivery.printed", { printer: printer.name }) : t("delivery.ready"));
  } catch (e) {
    console.error(e);
    await notify(t("delivery.title", { n: doc.n }), t("delivery.failed", { error: String(e) }));
  } finally {
    await useEditions.getState().save({ ...doc, log });
  }
}

/** "Salvar PDF": grava a edição em ~/Documents/Morning Paper e mostra o arquivo no Finder. */
export async function saveViewedPdf() {
  const { editions } = useEditions.getState();
  const viewing = useReader.getState().viewing;
  const doc = editions.find((e) => e.n === viewing) ?? editions[0];
  if (!doc) return;
  if (!isTauri()) {
    window.print();
    return;
  }
  try {
    const path = await savePdfOf(doc);
    toast(t("print.toast.pdfSaved", { file: path.split("/").pop() }));
    await revealInFinder(path);
  } catch (e) {
    console.error(e);
    toast(t("print.toast.dialogFailed"), "err");
  }
}
