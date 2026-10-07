import { useEffect } from "react";
import { t } from "../i18n";
import { nextEditionDate, whenLabel } from "../lib/dates";
import { onTrayAction } from "../lib/native";
import { useEditions } from "../store/editions";
import { useNavigation } from "../store/navigation";
import { usePreferences } from "../store/preferences";
import { toast } from "../store/toasts";

/** Responde ao menu do ícone na barra de menus do macOS. */
export function useTrayActions() {
  useEffect(() => {
    const unlisten = onTrayAction((action) => {
      const { go } = useNavigation.getState();
      switch (action) {
        case "open": go("hoje"); break;
        case "print": go("imprimir"); break;
        case "prefs": go("preferencias"); break;
        case "generate": useEditions.getState().generate("manual"); break;
        case "pause": {
          const prefs = usePreferences.getState();
          const next = nextEditionDate(prefs.time, prefs.repeat);
          const paused = prefs.skipDate !== next;
          prefs.set({ skipDate: paused ? next : null });
          toast(paused ? t("tray.toast.paused", { when: whenLabel(next) }) : t("tray.toast.resumed"));
          break;
        }
      }
    });
    return () => { unlisten.then((f) => f()); };
  }, []);
}
