import { useTranslation } from "react-i18next";
import { TextLink } from "../../components/ui/TextLink";
import { nextEditionDate, whenLabel } from "../../lib/dates";
import { usePreferences } from "../../store/preferences";

export function NextEditionNote() {
  const { t } = useTranslation();
  const time = usePreferences((s) => s.time);
  const repeat = usePreferences((s) => s.repeat);
  const skipDate = usePreferences((s) => s.skipDate);
  const next = nextEditionDate(time, repeat);
  const paused = skipDate === next;
  const when = whenLabel(next);
  return (
    <section className="border-t-2 border-ink pt-4" aria-labelledby="h-next">
      <p className="eyebrow">{t("today.next")}</p>
      <h3 id="h-next" className="mt-2 mb-1">{paused ? t("today.pausedTitle", { when }) : t("today.nextTitle", { time, when })}</h3>
      <p className="mb-3 text-muted">{t("today.nextText")}</p>
      <TextLink to="preferencias" focus="pref-time">{t("today.changeTime")}</TextLink>
    </section>
  );
}
