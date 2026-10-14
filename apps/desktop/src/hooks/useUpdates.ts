import { useEffect, useRef } from "react";
import { t } from "../i18n";
import { notify, onUpdateStatus, setAutoUpdate } from "../lib/native";
import { usePreferences } from "../store/preferences";
import { toast } from "../store/toasts";
import { useUpdate } from "../store/update";

/** Acompanha a atualização do lado nativo e avisa uma vez por versão (notificação do macOS). */
export function useUpdates() {
  const autoUpdate = usePreferences((s) => s.autoUpdate);
  const phase = useUpdate((s) => s.status?.phase);
  const version = useUpdate((s) => s.status?.version);
  const current = useUpdate((s) => s.status?.current);
  const notified = useRef<string | null>(null);

  useEffect(() => {
    useUpdate.getState().load().catch(() => {});
    const unlisten = onUpdateStatus((s) => useUpdate.getState().set(s));
    return () => { unlisten.then((f) => f()); };
  }, []);

  useEffect(() => {
    setAutoUpdate(autoUpdate).catch(() => {});
  }, [autoUpdate]);

  // Avisa quando há versão para instalar ou já instalada esperando o reinício.
  useEffect(() => {
    if (!version || (phase !== "available" && phase !== "ready")) return;
    const key = `${phase}:${version}`;
    if (notified.current === key) return;
    notified.current = key;
    if (phase === "available") notify(t("update.notify.title"), t("update.notify.available", { version }));
    else notify(t("update.notify.title"), t("update.notify.ready", { version }));
  }, [phase, version]);

  // Depois de reiniciar na versão nova: conta o que aconteceu, uma vez.
  useEffect(() => {
    if (!current) return;
    const { seenVersion, set } = usePreferences.getState();
    if (seenVersion && seenVersion !== current) toast(t("update.toast.updated", { version: current }));
    if (seenVersion !== current) set({ seenVersion: current });
  }, [current]);
}
