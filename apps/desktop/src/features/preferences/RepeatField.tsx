import { useTranslation } from "react-i18next";
import type { Repeat } from "../../data/types";
import { appLanguage } from "../../i18n";
import { nextEditionDate, whenLabel } from "../../lib/dates";
import { DAILY } from "../../lib/schedule";
import { usePreferences } from "../../store/preferences";
import { toast } from "../../store/toasts";

const INTERVALS = [2, 3, 4, 5, 6, 7];
/** Segunda a domingo (0 = domingo, como em Date.getDay()). */
const WEEK = [1, 2, 3, 4, 5, 6, 0];
/** 7 de janeiro de 2024 foi um domingo: base para o nome curto de cada dia no idioma do app. */
const dayName = (d: number) => new Date(2024, 0, 7 + d).toLocaleDateString(appLanguage(), { weekday: "short" }).replace(".", "");

/** Frequência da edição: todos os dias, a cada N dias ou em dias da semana escolhidos. */
export function RepeatField() {
  const { t } = useTranslation();
  const { time, repeat, set } = usePreferences();

  const update = (patch: Partial<Repeat>) => {
    const next: Repeat = { ...repeat, ...patch };
    // "A cada N dias" conta a partir da próxima edição diária (hoje, se o horário não passou; senão amanhã).
    if (next.mode === "interval" && (patch.mode || patch.every)) next.from = nextEditionDate(time, DAILY);
    set({ repeat: next });
    if (next.mode !== "weekdays" || next.days.length) {
      toast(t("prefs.toast.repeat", { when: whenLabel(nextEditionDate(time, next)), time }));
    }
  };

  const toggleDay = (d: number) =>
    update({ days: repeat.days.includes(d) ? repeat.days.filter((x) => x !== d) : [...repeat.days, d].sort() });
  const noDays = repeat.mode === "weekdays" && !repeat.days.length;

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="pref-repeat">{t("prefs.morning.repeat")}</label>
        <select id="pref-repeat" className="w-auto" value={repeat.mode} onChange={(e) => update({ mode: e.target.value as Repeat["mode"] })}>
          <option value="daily">{t("prefs.morning.repeatDaily")}</option>
          <option value="interval">{t("prefs.morning.repeatInterval")}</option>
          <option value="weekdays">{t("prefs.morning.repeatWeekdays")}</option>
        </select>
      </div>
      {repeat.mode === "interval" && (
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="pref-every">{t("prefs.morning.every")}</label>
          <select id="pref-every" className="w-auto" value={repeat.every} onChange={(e) => update({ every: Number(e.target.value) })}>
            {INTERVALS.map((n) => <option key={n} value={n}>{t("prefs.morning.everyOption", { count: n })}</option>)}
          </select>
        </div>
      )}
      {repeat.mode === "weekdays" && (
        <fieldset className="grid gap-1.5">
          <legend className="sr-only">{t("prefs.morning.days")}</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEK.map((d) => (
              <label key={d} className="relative">
                <input type="checkbox" className="peer absolute inset-0 m-0 cursor-pointer opacity-0" checked={repeat.days.includes(d)} onChange={() => toggleDay(d)} />
                <span className="grid min-h-8 min-w-11 place-items-center rounded-ctl border border-line-strong px-2 text-13 font-semibold capitalize peer-checked:border-ink peer-checked:bg-ink peer-checked:text-on-ink peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                  {dayName(d)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <small className="text-12 text-muted" aria-live="polite">
        {noDays ? t("prefs.morning.noDays") : t("prefs.morning.nextNote", { when: whenLabel(nextEditionDate(time, repeat)), time })}
      </small>
    </div>
  );
}

