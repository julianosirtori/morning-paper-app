import { useTranslation } from "react-i18next";
import { PAGE_LENGTHS, TIMES } from "../../data/constants";
import { Choice } from "../../components/ui/Choice";
import { applyWake } from "../../services/wake";
import { usePreferences } from "../../store/preferences";
import { toast } from "../../store/toasts";
import { PrefSection } from "./PrefSection";
import { RepeatField } from "./RepeatField";

export function MorningEditionSection() {
  const { t } = useTranslation();
  const { time, length, delivery, background, set } = usePreferences();
  return (
    <PrefSection titleId="h-p-ed" title={t("prefs.morning.title")}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="pref-time">{t("prefs.morning.time")}</label>
        <select id="pref-time" className="w-auto" value={time} onChange={(e) => {
          set({ time: e.target.value });
          toast(t("prefs.toast.time", { time: e.target.value }));
          // O despertar do Mac acompanha o novo horário
          if (background.wake) applyWake(true, e.target.value);
        }}>
          {TIMES.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <RepeatField />
      <div className="grid gap-1">
        <span className="font-semibold" id="len-lbl">{t("prefs.morning.length")}</span>
        <div className="seg" role="radiogroup" aria-labelledby="len-lbl">
          {PAGE_LENGTHS.map((n) => (
            <label key={n}>
              <input type="radio" name="len" value={n} checked={length === n} onChange={() => { set({ length: n }); toast(t("prefs.toast.length", { count: +n })); }} />
              <span>{t("prefs.morning.lengthOption", { count: +n })}</span>
            </label>
          ))}
        </div>
        <small className="text-12 text-muted">{t("prefs.morning.lengthNote")}</small>
      </div>
      <Choice type="checkbox" checked={delivery.pdf} onChange={(e) => set({ delivery: { ...delivery, pdf: e.target.checked } })}>{t("prefs.morning.pdf")}</Choice>
      <Choice type="checkbox" checked={delivery.print} onChange={(e) => set({ delivery: { ...delivery, print: e.target.checked } })}>{t("prefs.morning.send")}</Choice>
    </PrefSection>
  );
}
