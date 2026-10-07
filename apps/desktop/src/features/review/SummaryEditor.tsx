import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { EditionStory } from "../../data/types";
import { Button } from "../../components/ui/Button";
import { useEditions } from "../../store/editions";
import { toast } from "../../store/toasts";

export function SummaryEditor({ n, story: s, onDone }: { n: number; story: EditionStory; onDone: () => void }) {
  const { t } = useTranslation();
  const updateStory = useEditions((st) => st.updateStory);
  const [draft, setDraft] = useState(s.summary);
  const id = `sum-${s.id}`;
  // Ao sair da edição, o foco volta para "Editar resumo"
  const finish = () => {
    onDone();
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-story="${CSS.escape(s.id)}"] [data-edit]`)?.focus());
  };
  return (
    <>
      <label className="sr-only" htmlFor={id}>{t("review.summaryOf", { title: s.title })}</label>
      <textarea
        id={id}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="min-h-24 w-full resize-y rounded-ctl border border-line-strong bg-field px-3 py-2 leading-normal"
      />
      <div className="mt-2 flex items-center gap-3">
        <Button size="sm" onClick={() => { updateStory(n, s.id, { summary: draft.trim() || s.summary }); finish(); toast(t("review.toast.saved")); }}>{t("review.saveSummary")}</Button>
        <Button variant="text" onClick={finish}>{t("review.cancel")}</Button>
      </div>
    </>
  );
}
