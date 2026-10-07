import clsx from "clsx";
import { useTranslation } from "react-i18next";
import type { Printer } from "../../data/types";
import { Button } from "../../components/ui/Button";
import { Choice } from "../../components/ui/Choice";
import { usePreferences } from "../../store/preferences";
import { usePrinter, useSystem, withDisplayName } from "../../store/system";
import { toast } from "../../store/toasts";
import { Note, PrefSection } from "./PrefSection";

/** Linha de detalhes: "Modelo · Rede · pronta", ou a explicação da opção PDF. */
function usePrinterMeta() {
  const { t } = useTranslation();
  return (p: Printer) => {
    if (p.status === "pdf") return t("printer.pdfMeta");
    const state = p.status === "offline" ? t("printer.offlineHint") : t(`printer.statusLower.${p.status}`);
    return [p.info, p.connection && t(`printer.connection.${p.connection}`), state].filter(Boolean).join(" · ");
  };
}

/** Impressoras do macOS (CUPS) + "Salvar como PDF". */
export function PrinterSection() {
  const { t } = useTranslation();
  const { printers, scanningPrinters, scanPrinters } = useSystem();
  const current = usePrinter();
  const { askPrinter, set } = usePreferences();
  const meta = usePrinterMeta();
  return (
    <PrefSection id="printer-pref" titleId="h-p-pr" title={t("prefs.printer.title")} note={<Note>{t("prefs.printer.note")}</Note>}>
      <div className="grid gap-0.5" role="radiogroup" aria-labelledby="h-p-pr">
        {printers.map(withDisplayName).map((p) => (
          <label key={p.id} className="flex cursor-pointer items-start gap-2 py-2">
            <input
              type="radio" name="printer" value={p.id} className="mt-[3px] size-4 flex-none"
              checked={current.id === p.id}
              onChange={() => { set({ printerId: p.id }); toast(t("prefs.toast.printer", { printer: p.name })); }}
            />
            <span>
              <span className="block font-semibold">{p.name}</span>
              <span className={clsx("block text-13", p.status === "offline" ? "text-accent" : "text-muted")}>{meta(p)}</span>
            </span>
          </label>
        ))}
      </div>
      <Choice type="checkbox" checked={askPrinter} onChange={(e) => set({ askPrinter: e.target.checked })}>{t("prefs.printer.ask")}</Choice>
      <div>
        <Button size="sm" disabled={scanningPrinters} onClick={() => scanPrinters({ announce: true })}>
          {scanningPrinters ? t("prefs.printer.scanning") : t("prefs.printer.scan")}
        </Button>
      </div>
    </PrefSection>
  );
}
