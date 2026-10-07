import { useTranslation } from "react-i18next";
import { contentFor } from "../../data/content";
import { NewspaperPage } from "../../components/newspaper/NewspaperPage";
import { Icon } from "../../components/ui/Icon";
import { appLanguage } from "../../i18n";
import { longDate } from "../../lib/dates";
import { localDate } from "../../engine/generate";

/** Boas-vindas: o que o app faz, com uma capa de exemplo. */
export function WelcomeStep() {
  const { t } = useTranslation();
  const sample = contentFor(appLanguage()).pages;
  const points = ["collect", "summarize", "print"] as const;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-12 pt-6 max-md:grid-cols-1">
      <div>
        <p className="font-serif text-[44px] leading-[.9] font-bold tracking-[-0.03em] uppercase">Morning<br />Paper</p>
        <h1 id="ob-welcome" tabIndex={-1} className="mt-6">{t("onboarding.welcome.title")}</h1>
        <p className="lead mt-2">{t("onboarding.welcome.lead")}</p>
        <ul className="mt-8 grid gap-4">
          {points.map((p) => (
            <li key={p} className="grid grid-cols-[20px_minmax(0,1fr)] gap-3">
              <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-ink text-on-ink"><Icon name="check" className="size-3 [stroke-width:2.4]" /></span>
              <span>
                <b className="block font-semibold">{t(`onboarding.welcome.${p}`)}</b>
                <span className="block text-13 text-muted">{t(`onboarding.welcome.${p}Detail`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto w-full max-w-[460px] rotate-[1.2deg]" aria-hidden="true">
        <NewspaperPage pages={sample} index={0} n={1} date={longDate(localDate())} style="classic" />
      </div>
    </div>
  );
}
