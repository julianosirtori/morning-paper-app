import clsx from "clsx";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Choice } from "../../components/ui/Choice";
import { Fact, Facts } from "../../components/ui/Facts";
import { Icon } from "../../components/ui/Icon";
import { Status } from "../../components/ui/Status";
import { TextLink } from "../../components/ui/TextLink";
import { useViewedEdition, usePages } from "../../hooks/useEdition";
import { dayMonth } from "../../lib/dates";
import { MAX_COPIES, usePrint } from "../../store/print";
import { usePrinter } from "../../store/system";

const Group = ({ legend, children }: { legend: string; children: ReactNode }) => (
  <fieldset className="mt-6">
    <legend className="mb-2 font-semibold">{legend}</legend>
    {children}
  </fieldset>
);

function CopiesStepper() {
  const { t } = useTranslation();
  const copies = usePrint((s) => s.copies);
  const setCopies = usePrint((s) => s.setCopies);
  const btn = "grid size-9 place-items-center disabled:opacity-40 hover:not-disabled:bg-panel-2";
  return (
    <div className="inline-flex items-center rounded-ctl border border-line-strong">
      <button type="button" className={btn} aria-label={t("print.lessCopy")} disabled={copies <= 1} onClick={() => setCopies(copies - 1)}><Icon name="minus" /></button>
      <output aria-live="polite" className="min-w-10 text-center font-semibold">{copies}</output>
      <button type="button" className={btn} aria-label={t("print.moreCopy")} disabled={copies >= MAX_COPIES} onClick={() => setCopies(copies + 1)}><Icon name="plus" /></button>
    </div>
  );
}

function PrintMessage() {
  const { t } = useTranslation();
  const message = usePrint((s) => s.message);
  if (!message) return null;
  return (
    <div role="status" className={clsx("mt-4 flex items-start gap-2 border-t border-line pt-3", message.tone === "err" ? "text-accent" : "text-ok")}>
      <Icon name={message.tone === "err" ? "alert" : "check"} className="mt-0.5" />
      <span>
        {message.text}
        {message.offline && <> <TextLink to="preferencias" focus="printer-pref" className="text-[length:inherit] text-inherit">{t("print.chooseAnother")}</TextLink>.</>}
      </span>
    </div>
  );
}

/** "Bilhete" de impressão: dados da edição, impressora, cópias e páginas. */
export function PrintTicket() {
  const { t } = useTranslation();
  const edition = useViewedEdition();
  const pages = usePages(edition);
  const printer = usePrinter();
  const range = usePrint((s) => s.range);
  const setRange = usePrint((s) => s.setRange);
  return (
    <div className="border border-ink bg-np-paper p-6">
      <div className="mb-2 border-b-[3px] border-ink pb-3 font-serif text-[32px] leading-[.85] font-bold tracking-[-0.03em] uppercase">Morning<br />Paper</div>
      <Facts>
        {edition && <Fact label={t("print.facts.edition")}>#{edition.n} · {dayMonth(edition.date)}</Fact>}
        <Fact label={t("print.facts.format")}>{t("print.facts.formatValue", { count: pages.length })}</Fact>
        <Fact label={t("print.facts.color")}>{t("print.facts.colorValue")}</Fact>
        <Fact label={t("print.facts.printer")}>{printer.name}<TextLink to="preferencias" focus="printer-pref">{t("print.change")}</TextLink></Fact>
        <Fact label={t("print.facts.status")}>
          {printer.status === "offline"
            ? <Status tone="err" icon="alert">{t("printer.status.offline")}</Status>
            : <Status tone="ok" icon="dot">{t(`printer.status.${printer.status}`)}</Status>}
        </Fact>
      </Facts>
      <Group legend={t("print.copies")}><CopiesStepper /></Group>
      <Group legend={t("print.range")}>
        <Choice type="radio" name="range" checked={range === "all"} onChange={() => setRange("all")}>{t("print.rangeAll", { count: pages.length })}</Choice>
        <Choice type="radio" name="range" checked={range === "front"} onChange={() => setRange("front")}>{t("print.rangeFront")}</Choice>
      </Group>
      <PrintMessage />
    </div>
  );
}
