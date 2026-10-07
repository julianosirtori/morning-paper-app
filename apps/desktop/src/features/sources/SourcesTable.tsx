import clsx from "clsx";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IconButton } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useSources } from "../../store/sources";
import { PriorityTag } from "./PriorityTag";
import { SourceStatus } from "./SourceStatus";

const cell = "border-b border-line py-3.5 pr-3 text-left align-middle";
const Head = ({ children, className }: { children: ReactNode; className?: string }) => (
  <th scope="col" className={clsx("border-b border-ink pt-0 pr-3 pb-2 text-left font-sans text-12 leading-[1.2] font-semibold text-muted", className)}>{children}</th>
);

type Props = { openMenuFor: string | null; onOpenMenu: (id: string, anchor: HTMLElement) => void };

export function SourcesTable({ openMenuFor, onOpenMenu }: Props) {
  const { t } = useTranslation();
  const sources = useSources((s) => s.sources);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <caption className="sr-only">{t("sources.caption")}</caption>
        <thead>
          <tr>
            <Head>{t("sources.col.source")}</Head><Head>{t("sources.col.section")}</Head><Head>{t("sources.col.status")}</Head>
            <Head className="text-right">{t("sources.col.today")}</Head><Head>{t("sources.col.priority")}</Head>
            <Head className="w-11 pr-0"><span className="sr-only">{t("sources.col.actions")}</span></Head>
          </tr>
        </thead>
        <tbody>
          {sources.map((s, i) => {
            const paused = s.paused;
            return (
              <tr key={s.id} className={clsx(paused && "text-muted")}>
                <th scope="row" className={clsx(cell, "font-serif text-16 leading-[1.3] font-semibold")}>
                  {s.name}
                  <span className="block max-w-[280px] truncate font-sans text-12 font-normal text-muted">{s.url.replace(/^https?:\/\//, "")}</span>
                </th>
                <td className={cell}>{t(`sections.${s.section}`)}</td>
                <td className={cell}><SourceStatus source={s} /></td>
                <td className={clsx(cell, "text-right whitespace-nowrap tabular-nums")}>{!paused && s.last?.ok ? s.last.count : "—"}</td>
                <td className={cell}><PriorityTag priority={s.priority} /></td>
                <td className={clsx(cell, "w-11 pr-0 text-right text-ink")}>
                  <IconButton
                    data-menu={i}
                    data-source={s.id}
                    aria-haspopup="menu"
                    aria-expanded={openMenuFor === s.id}
                    aria-label={t("sources.optionsFor", { name: s.name })}
                    onClick={(e) => onOpenMenu(s.id, e.currentTarget)}
                  >
                    <Icon name="more" />
                  </IconButton>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
