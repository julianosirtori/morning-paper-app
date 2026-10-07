import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { saveViewedPdf } from "../../services/delivery";
import { useEditions } from "../../store/editions";
import { useNavigation } from "../../store/navigation";
import { usePrint } from "../../store/print";
import { usePrinter } from "../../store/system";
import { useUi } from "../../store/ui";

export type Command = { label: string; hint: string; run: () => void };

export function useCommands(): Command[] {
  const { t } = useTranslation();
  const go = useNavigation((s) => s.go);
  const print = usePrint((s) => s.print);
  const generate = useEditions((s) => s.generate);
  const printer = usePrinter();
  const openAdd = useUi((s) => s.setAddSourceOpen);
  return useMemo(() => {
    const nav = t("palette.hint.navigate"), action = t("palette.hint.action"), prefs = t("palette.hint.prefs");
    return [
      { label: t("palette.cmd.today"), hint: nav, run: () => go("hoje") },
      { label: t("palette.cmd.read"), hint: nav, run: () => go("edicao") },
      { label: t("palette.cmd.review"), hint: nav, run: () => go("revisar") },
      { label: t("palette.cmd.printNow"), hint: action, run: () => { go("imprimir"); print(printer); } },
      { label: t("palette.cmd.generate"), hint: action, run: () => { go("hoje"); generate("manual"); } },
      { label: t("palette.cmd.savePdf"), hint: action, run: saveViewedPdf },
      { label: t("palette.cmd.addSource"), hint: action, run: () => { go("fontes"); openAdd(true); } },
      { label: t("palette.cmd.sources"), hint: nav, run: () => go("fontes") },
      { label: t("palette.cmd.style"), hint: prefs, run: () => go("preferencias", { focus: "pref-style" }) },
      { label: t("palette.cmd.time"), hint: prefs, run: () => go("preferencias", { focus: "pref-time" }) },
      { label: t("palette.cmd.printer"), hint: prefs, run: () => go("preferencias", { focus: "printer-pref" }) },
      { label: t("palette.cmd.prefs"), hint: "⌘,", run: () => go("preferencias") },
    ];
  }, [t, go, print, generate, printer, openAdd]);
}
