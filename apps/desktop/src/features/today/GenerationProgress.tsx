import { useTranslation } from "react-i18next";
import { useEditions } from "../../store/editions";

/** Painel com a etapa atual enquanto a edição é gerada. */
export function GenerationProgress() {
  const { t } = useTranslation();
  const progress = useEditions((s) => s.progress);
  if (!progress) return null;
  const steps = ["collecting", "grouping", "summarizing", "building"] as const;
  const current = steps.indexOf(progress.step);
  const label =
    progress.step === "collecting" ? t("generate.step.collecting")
      : progress.step === "summarizing" ? t("generate.step.summarizing", { name: progress.assistant })
        : t(`generate.step.${progress.step}`);
  return (
    <section role="status" aria-live="polite" className="max-w-[520px] border-t-2 border-ink pt-4">
      <p className="eyebrow">{t("generate.inProgress")}</p>
      <h3 className="mt-2 mb-3">{label}</h3>
      <div className="h-1 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="h-full bg-ink transition-[width] duration-500 ease-out-soft" style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
      </div>
      <p className="note mt-2">{t("generate.hint")}</p>
    </section>
  );
}
