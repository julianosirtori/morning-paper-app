import { useTranslation } from "react-i18next";
import { ViewHeader } from "../../components/ui/ViewHeader";
import { PrintTicket } from "./PrintTicket";
import { EditionHistory } from "./EditionHistory";

export function PrintView() {
  const { t } = useTranslation();
  return (
    <>
      <ViewHeader
        eyebrow={t("print.eyebrow")}
        title={t("print.title")}
        titleId="h-imprimir"
        lead={t("print.lead")}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-12 max-md:grid-cols-1">
        <PrintTicket />
        <EditionHistory />
      </div>
    </>
  );
}
