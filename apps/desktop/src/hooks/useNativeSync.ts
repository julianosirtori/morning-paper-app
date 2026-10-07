import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { nextEditionDate, whenLabel } from "../lib/dates";
import { applyBackground, setSchedule, setTrayTexts, showMainWindow } from "../lib/native";
import { useEditions, useLatestEdition } from "../store/editions";
import { usePreferences } from "../store/preferences";
import { useSources } from "../store/sources";
import { usePrinter, useSystem } from "../store/system";

/** Leva o estado do React para o lado nativo: agenda, segundo plano, Dock e menu da barra de menus. */
export function useNativeSync() {
  const { t } = useTranslation();
  const { background, time, repeat, skipDate, onboarded } = usePreferences();
  const printer = usePrinter();
  const latest = useLatestEdition();
  const generating = useEditions((s) => s.progress !== null);
  const loaded = useEditions((s) => s.loaded);
  const hasSources = useSources((s) => s.sources.some((x) => !x.paused));

  useEffect(() => {
    useSystem.getState().scanPrinters();
    useSystem.getState().scanAgents();
    useEditions.getState().load();
  }, []);

  // Primeira abertura: mesmo se o app iniciou escondido (login), mostra a janela do onboarding.
  useEffect(() => {
    if (!onboarded) showMainWindow();
  }, [onboarded]);

  useEffect(() => {
    applyBackground(background).catch((e) => console.warn(e));
  }, [background]);

  // O agendador (Rust) só começa depois de carregar as edições, para saber se a de hoje já existe.
  useEffect(() => {
    if (!loaded) return;
    setSchedule({ enabled: onboarded && hasSources, time, repeat, skipDate, lastRun: latest?.date ?? null }).catch(() => {});
  }, [loaded, onboarded, hasSources, time, repeat, skipDate, latest?.date]);

  useEffect(() => {
    const next = nextEditionDate(time, repeat);
    const paused = skipDate === next;
    const title = generating ? t("tray.generating") : paused ? t("tray.paused") : latest ? t("tray.ready", { n: latest.n }) : t("tray.none");
    setTrayTexts({
      title,
      detail: t("tray.detail", { printer: printer.name, time, when: whenLabel(next) }),
      open: t("tray.open"),
      print: t("tray.print"),
      generate: t("tray.generate"),
      pause: paused ? t("tray.resume") : t("tray.pause"),
      prefs: t("tray.prefs"),
      quit: t("tray.quit"),
    }).catch(() => {});
  }, [t, generating, skipDate, latest, printer.name, time, repeat]);
}
