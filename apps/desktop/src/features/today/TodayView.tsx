import { useTranslation } from "react-i18next";
import { ViewHeader } from "../../components/ui/ViewHeader";
import { localDate } from "../../engine/generate";
import { longDate } from "../../lib/dates";
import { useEditions, useLatestEdition } from "../../store/editions";
import { FrontPagePreview } from "./FrontPagePreview";
import { EditionFacts } from "./EditionFacts";
import { EditionTimeline } from "./EditionTimeline";
import { NextEditionNote } from "./NextEditionNote";
import { GenerationProgress } from "./GenerationProgress";
import { EmptyToday } from "./EmptyToday";

export function TodayView() {
  const { t } = useTranslation();
  const latest = useLatestEdition();
  const generating = useEditions((s) => s.progress !== null);
  const isToday = latest?.date === localDate();

  if (!latest) {
    return (
      <>
        <ViewHeader eyebrow={longDate(localDate())} title={t("today.emptyTitle")} titleId="h-hoje" lead={t("today.emptyLead")} />
        {generating ? <GenerationProgress /> : <EmptyToday />}
      </>
    );
  }

  return (
    <>
      <ViewHeader
        eyebrow={t("today.eyebrow", { date: longDate(latest.date), n: latest.n })}
        title={isToday ? t("today.title") : t("today.oldTitle")}
        titleId="h-hoje"
        lead={isToday ? t("today.lead") : t("today.oldLead")}
      />
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)] items-start gap-12 max-lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] max-lg:gap-8 max-md:grid-cols-1">
        <FrontPagePreview doc={latest} />
        <div className="grid gap-8">
          {generating && <GenerationProgress />}
          <EditionFacts doc={latest} />
          <EditionTimeline doc={latest} />
          <NextEditionNote />
        </div>
      </div>
    </>
  );
}
