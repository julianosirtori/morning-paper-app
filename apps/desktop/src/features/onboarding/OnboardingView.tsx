import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { localDate } from "../../engine/generate";
import { nextEditionDate } from "../../lib/dates";
import { useEditions } from "../../store/editions";
import { useNavigation } from "../../store/navigation";
import { usePreferences } from "../../store/preferences";
import { useSources, type NewSource } from "../../store/sources";
import { WelcomeStep } from "./WelcomeStep";
import { SourcesStep } from "./SourcesStep";
import { FinishStep } from "./FinishStep";
import { MorningEditionSection } from "../preferences/MorningEditionSection";
import { TopicsSection } from "../preferences/TopicsSection";
import { PrinterSection } from "../preferences/PrinterSection";
import { AssistantSection } from "../preferences/AssistantSection";
import { BackgroundSection } from "../preferences/BackgroundSection";

/** Passo com uma única seção de Preferências: o cabeçalho do passo já faz o papel do título dela. */
const Single = ({ children }: { children: ReactNode }) => (
  <div className="max-w-[860px] [&>section]:border-t-0 [&>section]:pt-0 [&>section>h2]:sr-only">{children}</div>
);

const STEPS = ["welcome", "sources", "edition", "printer", "assistant", "background", "finish"] as const;
type Step = (typeof STEPS)[number];

/** Primeira abertura: configura fontes, horário, impressora, IA e segundo plano, e gera a primeira edição. */
export function OnboardingView() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<NewSource[]>([]);
  const step: Step = STEPS[index];
  const counted = STEPS.length - 2; // sem boas-vindas e conclusão

  const finish = async (generateNow: boolean) => {
    useSources.getState().addMany(chosen);
    // "Esperar até amanhã" depois do horário: não deixa o agendador recuperar a edição de hoje.
    const prefs = usePreferences.getState();
    const today = localDate();
    const skipToday = !generateNow && nextEditionDate(prefs.time, prefs.repeat) !== today;
    prefs.set({ onboarded: true, skipDate: skipToday ? today : prefs.skipDate });
    useNavigation.getState().go("hoje");
    if (generateNow) await useEditions.getState().generate("onboarding");
  };

  const body: Record<Step, ReactNode> = {
    welcome: <WelcomeStep />,
    sources: <SourcesStep chosen={chosen} onChange={setChosen} />,
    edition: <div className="grid grid-cols-2 gap-x-12 gap-y-8 max-md:grid-cols-1"><MorningEditionSection /><TopicsSection /></div>,
    printer: <Single><PrinterSection /></Single>,
    assistant: <Single><AssistantSection /></Single>,
    background: <Single><BackgroundSection /></Single>,
    finish: <FinishStep sources={chosen.length} onFinish={finish} />,
  };
  const canContinue = step !== "sources" || chosen.length > 0;

  return (
    <div className="grid h-screen grid-rows-[56px_minmax(0,1fr)_auto] bg-paper">
      <header className="flex items-center justify-end pr-8 select-none" data-tauri-drag-region>
        {index > 0 && index < STEPS.length - 1 && (
          <span className="pointer-events-none text-12 text-muted" aria-live="polite">{t("onboarding.stepOf", { step: index, total: counted })}</span>
        )}
      </header>
      <main className="min-h-0 overflow-auto px-12 pb-10 max-lg:px-8" aria-labelledby={`ob-${step}`}>
        <div className="mx-auto max-w-[1040px]">
          {step !== "welcome" && step !== "finish" && (
            <header className="mb-8 border-b-2 border-ink pb-6">
              <p className="eyebrow">{t(`onboarding.${step}.eyebrow`)}</p>
              <h1 id={`ob-${step}`} tabIndex={-1}>{t(`onboarding.${step}.title`)}</h1>
              <p className="lead">{t(`onboarding.${step}.lead`)}</p>
            </header>
          )}
          {body[step]}
        </div>
      </main>
      {step !== "finish" && (
        <footer className="flex items-center justify-between gap-4 border-t border-line px-12 py-4 max-lg:px-8">
          <div>{index > 0 && <Button onClick={() => setIndex(index - 1)}>{t("onboarding.back")}</Button>}</div>
          <div className="flex items-center gap-4">
            {!canContinue && <span className="text-13 text-accent" role="status">{t("onboarding.sources.needOne")}</span>}
            <Button variant="primary" disabled={!canContinue} onClick={() => setIndex(index + 1)}>
              {step === "welcome" ? t("onboarding.start") : t("onboarding.next")}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
