import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { Status } from "../../components/ui/Status";
import { SwitchRow } from "../../components/ui/Switch";
import { restartToUpdate } from "../../lib/native";
import { usePreferences } from "../../store/preferences";
import { useUpdate } from "../../store/update";
import { Note, PrefSection } from "./PrefSection";

/** Versão do app, busca de versões novas e instalação automática (src-tauri/src/updater.rs). */
export function UpdatesSection() {
  const { t } = useTranslation();
  const { autoUpdate, set } = usePreferences();
  const { status, check } = useUpdate();
  const phase = status?.phase ?? "idle";
  const version = status?.version ?? "";
  const busy = phase === "checking" || phase === "downloading";

  const toggleAuto = (v: boolean) => {
    set({ autoUpdate: v });
    // Ligou com uma versão já esperando: instala agora.
    if (v && phase === "available") check(true);
  };

  return (
    <PrefSection id="updates-pref" titleId="h-p-upd" title={t("update.title")} note={<Note>{t("update.note", { version: status?.current ?? "" })}</Note>}>
      <div className="flex flex-wrap items-center justify-between gap-3" aria-live="polite">
        <UpdateLine />
        {phase === "ready" ? (
          <Button variant="primary" onClick={() => restartToUpdate()}>{t("update.restart")}</Button>
        ) : phase === "available" ? (
          <Button variant="primary" onClick={() => check(true)}>{t("update.install", { version })}</Button>
        ) : (
          <Button onClick={() => check()} disabled={busy} aria-busy={busy || undefined}>
            {phase === "checking" ? t("update.checking") : t("update.check")}
          </Button>
        )}
      </div>
      <SwitchRow label={t("update.auto")} description={t("update.autoNote")} checked={autoUpdate} onChange={toggleAuto} />
    </PrefSection>
  );
}

function UpdateLine() {
  const { t } = useTranslation();
  const status = useUpdate((s) => s.status);
  const version = status?.version ?? "";
  switch (status?.phase) {
    case "checking":
      return <Status tone="muted" icon="dot">{t("update.checking")}</Status>;
    case "upToDate":
      return <Status tone="ok" icon="check">{t("update.upToDate")}</Status>;
    case "available":
      return <Status tone="muted" icon="dot">{t("update.available", { version })}</Status>;
    case "downloading":
      return <Status tone="muted" icon="dot">{t("update.downloading", { version, pct: Math.round((status.progress ?? 0) * 100) })}</Status>;
    case "ready":
      return <Status tone="ok" icon="check">{t("update.ready", { version })}</Status>;
    case "error":
      return <Status tone="err" icon="alert">{t("update.error")}</Status>;
    default:
      return <span className="text-13 text-muted">{t("update.idle")}</span>;
  }
}
