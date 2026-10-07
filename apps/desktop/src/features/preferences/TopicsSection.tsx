import { useTranslation } from "react-i18next";
import { usePreferences } from "../../store/preferences";
import { Note, PrefSection } from "./PrefSection";

/** Assuntos com porcentagem ao vivo; o total fica sempre em 100%. */
export function TopicsSection() {
  const { t } = useTranslation();
  const { topics, setTopic } = usePreferences();
  const total = topics.reduce((s, x) => s + x.v, 0);
  return (
    <PrefSection titleId="h-p-top" title={t("prefs.topics.title")} note={<Note>{t("prefs.topics.note")}</Note>}>
      <div className="grid gap-1">
        {topics.map((topic, i) => (
          <div key={topic.n} className="grid min-h-8 grid-cols-[100px_minmax(0,1fr)_48px] items-center gap-3">
            <label htmlFor={`tp-${i}`} className="font-semibold">{t(`sections.${topic.n}`)}</label>
            <input type="range" id={`tp-${i}`} min={0} max={100} step={5} value={topic.v} aria-valuetext={`${topic.v}%`} onChange={(e) => setTopic(i, +e.target.value)} />
            <output htmlFor={`tp-${i}`} className="text-right font-semibold">{topic.v}%</output>
          </div>
        ))}
      </div>
      <div className="flex justify-between border-t border-line pt-2 text-13 text-muted">
        <span>{t("prefs.topics.total")}</span><b>{total}%</b>
      </div>
    </PrefSection>
  );
}
