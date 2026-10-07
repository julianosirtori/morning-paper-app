import { useTranslation } from "react-i18next";
import type { EditionDoc } from "../../data/types";
import { Icon } from "../../components/ui/Icon";
import { SectionTitle } from "../../components/ui/ViewHeader";
import { clock } from "../../lib/dates";

/** "Enquanto você dormia": o que aconteceu de verdade para montar esta edição, com os horários. */
export function EditionTimeline({ doc }: { doc: EditionDoc }) {
  const { t } = useTranslation();
  const title = (step: EditionDoc["log"][number]) => {
    switch (step.step) {
      case "collected": return [t("today.timeline.collected"), t("today.timeline.collectedDetail", { count: Number(step.detail ?? 0) })];
      case "grouped": return [t("today.timeline.grouped"), t("today.timeline.groupedDetail", { count: Number(step.detail ?? 0) })];
      case "summarized": return [t("today.timeline.summarized"), t("today.timeline.summarizedDetail", { name: step.detail })];
      case "built": return [t("today.timeline.built"), t("today.timeline.builtDetail", { style: t(`styles.${doc.style}.name`) })];
      case "pdf": return [t("today.timeline.pdf"), step.detail?.split("/").pop() ?? ""];
      case "sent": return [t("today.timeline.sent"), step.detail ?? ""];
    }
  };
  const created = new Date(doc.createdAt);
  const overnight = created.getHours() < 9;
  return (
    <section aria-labelledby="h-tl">
      <SectionTitle id="h-tl">{overnight ? t("today.timelineTitle") : t("today.timelineTitleManual")}</SectionTitle>
      <ol>
        {doc.log.map((step, i) => {
          const [b, d] = title(step);
          return (
            <li key={i} className="relative grid grid-cols-[48px_20px_minmax(0,1fr)] gap-3 pb-4">
              {i < doc.log.length - 1 && <span aria-hidden="true" className="absolute top-6 bottom-1 left-[69.5px] w-px bg-line-strong" />}
              <time className="font-sans text-13 leading-5 font-semibold text-muted tabular-nums">{clock(step.at)}</time>
              <span className="grid size-5 place-items-center rounded-full bg-ink text-on-ink">
                <Icon name="check" className="size-3 [stroke-width:2.4]" />
              </span>
              <span>
                <b className="block leading-5 font-semibold">{b}</b>
                <span className="block text-13 text-muted wrap-anywhere">{d}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {doc.aiError && <p className="note mt-1">{t("today.aiSkipped")}</p>}
    </section>
  );
}
