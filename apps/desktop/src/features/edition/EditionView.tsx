import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { ViewHeader } from "../../components/ui/ViewHeader";
import { useViewedEdition } from "../../hooks/useEdition";
import { longDate } from "../../lib/dates";
import { useLatestEdition } from "../../store/editions";
import { useReader } from "../../store/reader";
import { EmptyToday } from "../today/EmptyToday";
import { PageThumbnails } from "./PageThumbnails";
import { PageStage } from "./PageStage";
import { ReaderControls } from "./ReaderControls";

export function EditionView() {
  const { t } = useTranslation();
  const doc = useViewedEdition();
  const latest = useLatestEdition();
  const open = useReader((s) => s.open);
  if (!doc) {
    return (
      <>
        <ViewHeader eyebrow={t("nav.edition")} title={t("edition.title")} titleId="h-edicao" lead={t("edition.lead")} />
        <EmptyToday />
      </>
    );
  }
  return (
    <>
      <ViewHeader eyebrow={t("edition.eyebrow", { date: longDate(doc.date), n: doc.n })} title={t("edition.title")} titleId="h-edicao" lead={t("edition.lead")}>
        {latest && doc.n !== latest.n && (
          <Button variant="text" className="mt-3" onClick={() => { open(null); document.getElementById("h-edicao")?.focus(); }}>
            {t("edition.backToToday")}
          </Button>
        )}
      </ViewHeader>
      <div className="grid grid-cols-[96px_minmax(0,1fr)_220px] items-start gap-8 max-lg:grid-cols-[88px_minmax(0,1fr)]">
        <PageThumbnails doc={doc} />
        <PageStage doc={doc} />
        <ReaderControls doc={doc} />
      </div>
    </>
  );
}
