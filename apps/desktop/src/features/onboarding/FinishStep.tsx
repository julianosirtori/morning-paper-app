import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { Fact, Facts } from "../../components/ui/Facts";
import { usePreferences } from "../../store/preferences";
import { useActiveAgent, usePrinter } from "../../store/system";

type Props = { sources: number; onFinish: (generateNow: boolean) => void };

/** Resumo do que foi configurado e a escolha: gerar a primeira edição agora ou esperar a manhã. */
export function FinishStep({ sources, onFinish }: Props) {
  const { t } = useTranslation();
  const { time, length } = usePreferences();
  const printer = usePrinter();
  const agent = useActiveAgent();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mx-auto grid max-w-[620px] gap-8 pt-10">
      <header className="border-b-2 border-ink pb-6">
        <p className="eyebrow">{t("onboarding.finish.eyebrow")}</p>
        <h1 id="ob-finish" tabIndex={-1}>{t("onboarding.finish.title")}</h1>
        <p className="lead">{t("onboarding.finish.lead", { time })}</p>
      </header>
      <Facts>
        <Fact label={t("today.facts.sources")}>{t("onboarding.finish.sources", { count: sources })}</Fact>
        <Fact label={t("prefs.morning.time")}>{time}</Fact>
        <Fact label={t("prefs.morning.length")}>{t("today.facts.pagesValue", { count: Number(length) })}</Fact>
        <Fact label={t("today.facts.printer")}>{printer.name}</Fact>
        <Fact label={t("today.facts.assistant")}>{agent.name}</Fact>
      </Facts>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary" disabled={busy} onClick={() => { setBusy(true); onFinish(true); }}>{t("onboarding.finish.generate")}</Button>
        <Button variant="text" disabled={busy} onClick={() => { setBusy(true); onFinish(false); }}>{t("onboarding.finish.later", { time })}</Button>
      </div>
      <p className="note">{t("onboarding.finish.note")}</p>
    </div>
  );
}
