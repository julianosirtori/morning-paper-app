import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { EditionStory } from "../../data/types";
import { HalftoneImage } from "../../components/newspaper/HalftoneImage";
import { clock } from "../../lib/dates";
import { openExternal } from "../../lib/native";
import { SummaryEditor } from "./SummaryEditor";
import { ReviewActions } from "./ReviewActions";

/** Uma notícia na revisão: dados, resumo (editável) e ações à direita. */
export function ReviewItem({ n, story: s }: { n: number; story: EditionStory }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  return (
    <article
      id={`rv-${CSS.escape(s.id)}`}
      data-story={s.id}
      aria-labelledby={`rv-t-${s.id}`}
      className="grid grid-cols-[120px_minmax(0,1fr)_180px] gap-6 border-b border-line py-6 max-lg:grid-cols-[96px_minmax(0,1fr)_160px] max-md:grid-cols-[88px_minmax(0,1fr)]"
    >
      <HalftoneImage kind="field" src={s.image} alt="" className={clsx("self-start", !s.inc && "opacity-45")} />
      <div>
        <p className="font-sans text-12 leading-[1.4] font-semibold tracking-[0.04em] text-muted uppercase">
          {t(`sections.${s.section}`)} · {s.sources.join(", ")}
          {s.published && <> · <span className="whitespace-nowrap">{clock(s.published)}</span></>} · {t(`review.importance.${s.importance}`)}
        </p>
        {s.head && <p className="mt-2 inline-block rounded-ctl bg-ink px-2 py-0.5 text-12 leading-[1.4] font-semibold text-on-ink">{t("review.headlineBadge")}</p>}
        <h3 id={`rv-t-${s.id}`} className={clsx("mt-2 mb-1", !s.inc && "text-muted")}>{s.title}</h3>
        <div className={clsx("mb-2 max-w-[62ch] text-16", s.inc ? "text-ink-2" : "text-muted")}>
          {editing ? <SummaryEditor n={n} story={s} onDone={() => setEditing(false)} /> : <p>{s.summary}</p>}
        </div>
        {s.url && (
          <a className="text-13 text-muted underline underline-offset-[3px]" href={s.url} onClick={(e) => { e.preventDefault(); openExternal(s.url!); }}>
            {t("review.openAt", { source: s.sources[0] })}
          </a>
        )}
      </div>
      <ReviewActions n={n} story={s} editing={editing} onEdit={() => setEditing(true)} />
    </article>
  );
}
