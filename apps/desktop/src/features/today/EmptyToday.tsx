import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { TextLink } from "../../components/ui/TextLink";
import { nextEditionDate, whenLabel } from "../../lib/dates";
import { useEditions } from "../../store/editions";
import { usePreferences } from "../../store/preferences";
import { useSources } from "../../store/sources";

/** Ainda não há nenhuma edição: explica quando chega e oferece gerar agora. */
export function EmptyToday() {
  const { t } = useTranslation();
  const time = usePreferences((s) => s.time);
  const repeat = usePreferences((s) => s.repeat);
  const hasSources = useSources((s) => s.sources.some((x) => !x.paused));
  const generate = useEditions((s) => s.generate);
  return (
    <div className="grid max-w-[560px] gap-4">
      <p className="lead">{hasSources ? t("today.emptyText", { time, when: whenLabel(nextEditionDate(time, repeat)) }) : t("today.emptyNoSources")}</p>
      <div className="flex items-center gap-4">
        {hasSources ? (
          <Button variant="primary" onClick={() => generate("manual")}>{t("generate.now")}</Button>
        ) : (
          <TextLink to="fontes">{t("today.addSources")}</TextLink>
        )}
      </div>
    </div>
  );
}
