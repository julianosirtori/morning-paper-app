import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { SECTIONS } from "../../data/constants";
import type { EditionStory, SectionKey } from "../../data/types";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useEditions } from "../../store/editions";
import { toast } from "../../store/toasts";

type Props = { n: number; story: EditionStory; editing: boolean; onEdit: () => void };

export function ReviewActions({ n, story: s, editing, onEdit }: Props) {
  const { t } = useTranslation();
  const updateStory = useEditions((st) => st.updateStory);
  const makeHeadline = useEditions((st) => st.makeHeadline);
  const noteId = `rv-head-note-${s.id}`;
  return (
    <div className="grid content-start justify-items-start gap-2 max-md:col-start-2 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-3">
      <p className={clsx("inline-flex items-center gap-1.5 text-13 font-semibold", s.inc ? "text-ok" : "text-muted")}>
        {s.inc ? <><Icon name="check" />{t("review.inEdition")}</> : t("review.outOfEdition")}
      </p>
      <Button
        size="sm"
        disabled={s.head}
        aria-describedby={s.head ? noteId : undefined}
        onClick={() => { updateStory(n, s.id, { inc: !s.inc }); toast(s.inc ? t("review.toast.removed") : t("review.toast.back")); }}
      >
        {s.inc ? t("review.remove") : t("review.putBack")}
      </Button>
      {s.head && <p className="note" id={noteId}>{t("review.headlineLocked")}</p>}
      <Button variant="text" data-edit disabled={editing} onClick={onEdit}>{t("review.editSummary")}</Button>
      <Button variant="text" disabled={s.head || !s.inc} onClick={() => { makeHeadline(n, s.id); toast(t("review.toast.headline")); }}>{t("review.makeHeadline")}</Button>
      <label className="grid w-full gap-0.5 text-12 text-muted max-md:w-auto max-md:grid-cols-[auto_auto] max-md:items-center max-md:gap-2">
        <span>{t("review.section")}</span>
        <select
          value={s.section}
          onChange={(e) => { const section = e.target.value as SectionKey; updateStory(n, s.id, { section }); toast(t("review.toast.moved", { section: t(`sections.${section}`) })); }}
        >
          {SECTIONS.map((x) => <option key={x} value={x}>{t(`sections.${x}`)}</option>)}
        </select>
      </label>
    </div>
  );
}
