import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { STYLE_IDS } from "../../data/constants";
import type { StyleId } from "../../data/types";
import { usePreferences } from "../../store/preferences";
import { toast } from "../../store/toasts";
import { Note, PrefSection } from "./PrefSection";

/** Amostra "Aa" de cada estilo, com a tipografia que ele usa no jornal. */
const SAMPLE: Record<StyleId, string> = {
  classic: "",
  modern: "font-sans font-extrabold tracking-[-0.04em]",
  financial: "border-t-4 border-ink pt-1",
  minimal: "font-normal",
};

export function StyleSection() {
  const { t } = useTranslation();
  const { style, set } = usePreferences();
  return (
    <PrefSection titleId="h-p-st" title={t("prefs.style.title")}>
      <div className="grid grid-cols-2 gap-2" id="pref-style" role="radiogroup" aria-labelledby="h-p-st">
        {STYLE_IDS.map((k) => (
          <label key={k} className="opt-card">
            <input type="radio" name="style" value={k} checked={style === k} onChange={() => { set({ style: k }); toast(t("prefs.toast.style", { style: t(`styles.${k}.name`) })); }} />
            <span aria-hidden="true" className={clsx("mb-1 font-serif text-[24px] leading-none font-bold tracking-[-0.02em]", SAMPLE[k])}>Aa</span>
            <b className="font-semibold">{t(`styles.${k}.name`)}</b>
            <small className="text-12 text-muted">{t(`styles.${k}.description`)}</small>
          </label>
        ))}
      </div>
      <Note>{t("prefs.style.note")}</Note>
    </PrefSection>
  );
}
