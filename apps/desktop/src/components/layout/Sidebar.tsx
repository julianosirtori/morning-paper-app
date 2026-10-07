import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "../ui/Icon";
import { useNavigation, type ViewId } from "../../store/navigation";
import { useLatestEdition } from "../../store/editions";
import { useActiveSourceCount } from "../../store/sources";

const APP_VERSION = "0.8.4";

type NavItem = { id: ViewId; label: string; icon: IconName; count?: number };

function NavLink({ item }: { item: NavItem }) {
  const current = useNavigation((s) => s.view === item.id);
  const go = useNavigation((s) => s.go);
  return (
    <a
      href={"#" + item.id}
      aria-current={current ? "page" : undefined}
      onClick={(e) => { e.preventDefault(); go(item.id); }}
      className={clsx(
        "flex min-h-9 items-center gap-2.5 rounded-ctl px-2.5 no-underline",
        current ? "bg-sel font-semibold text-ink" : "font-medium text-ink-2 hover:bg-panel-2",
      )}
    >
      <Icon name={item.icon} />
      {item.label}
      {item.count !== undefined && <span className="ml-auto text-12 text-muted tabular-nums">{item.count}</span>}
    </a>
  );
}

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <>
      <div className="px-2.5 pt-3 pb-1 text-12 leading-none font-semibold text-muted">{label}</div>
      <div className="grid gap-0.5">{items.map((it) => <NavLink key={it.id} item={it} />)}</div>
    </>
  );
}

/** Menu lateral: 6 destinos, item ativo sempre marcado (padrão da sidebar do macOS). */
export function Sidebar() {
  const { t } = useTranslation();
  const latest = useLatestEdition();
  const included = latest ? latest.stories.filter((s) => s.inc).length : undefined;
  const sources = useActiveSourceCount();
  return (
    <aside className="flex min-h-0 cursor-default flex-col gap-2 overflow-y-auto border-r border-line bg-panel px-3 pb-4 select-none">
      {/* Faixa dos botões nativos da janela (traffic lights); também arrasta a janela */}
      <div className="h-14 flex-none" data-tauri-drag-region />
      <div className="px-2.5 pb-4" data-tauri-drag-region>
        <b className="block font-serif text-[24px] leading-[.9] font-bold tracking-[-0.03em] uppercase">Morning<br />Paper</b>
        <small className="mt-2 block text-12 leading-[1.3] text-muted">{t("app.tagline")}</small>
      </div>
      <nav aria-label={t("nav.label")}>
        <NavGroup
          label={t("nav.groupRead")}
          items={[
            { id: "hoje", label: t("nav.today"), icon: "today" },
            { id: "edicao", label: t("nav.edition"), icon: "paper" },
            { id: "revisar", label: t("nav.review"), icon: "review", count: included },
            { id: "imprimir", label: t("nav.print"), icon: "print" },
          ]}
        />
        <NavGroup
          label={t("nav.groupSetup")}
          items={[
            { id: "fontes", label: t("nav.sources"), icon: "feed", count: sources },
            { id: "preferencias", label: t("nav.preferences"), icon: "prefs" },
          ]}
        />
      </nav>
      <div className="mt-auto border-t border-line px-2.5 pt-4 text-12 text-muted">
        <b className="block font-semibold text-ink">{t("app.footerTitle", { version: APP_VERSION })}</b>
        {t("app.footerNote")}
      </div>
    </aside>
  );
}
