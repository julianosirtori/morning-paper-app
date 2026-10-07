import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { useUi } from "../../store/ui";

/** Só aparece quando não há nenhuma fonte. */
export function EmptySources() {
  const { t } = useTranslation();
  const openAdd = useUi((s) => s.setAddSourceOpen);
  return (
    <div className="max-w-[520px] py-12">
      <div className="relative mb-4 h-12 w-9 border-2 border-b-0 border-ink" aria-hidden="true">
        <span className="absolute top-2.5 right-1.5 left-1.5 h-0.5 bg-ink shadow-[0_8px_var(--color-ink),0_16px_var(--color-line-strong)]" />
      </div>
      <h2 className="mb-2">{t("sources.empty.title")}</h2>
      <p className="lead mb-4">{t("sources.empty.text")}</p>
      <Button data-open-add onClick={() => openAdd(true)}>{t("sources.empty.action")}</Button>
    </div>
  );
}
