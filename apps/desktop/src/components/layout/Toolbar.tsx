import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { useNavigation } from "../../store/navigation";
import { useUi } from "../../store/ui";
import { useToolbarConfig } from "./useToolbarConfig";

/** Barra de ferramentas contextual (Apple HIG): só as ações da tela atual. */
export function Toolbar() {
  const { t } = useTranslation();
  const view = useNavigation((s) => s.view);
  const { title, meta, actions } = useToolbarConfig(view);
  const openPalette = useUi((s) => s.setPaletteOpen);
  return (
    <header
      className="flex min-h-14 flex-wrap items-center justify-between gap-4 border-b border-line py-2 pr-6 pl-8 select-none"
      data-tauri-drag-region
    >
      <div className="pointer-events-none min-w-0">
        <b className="block font-serif text-16 leading-[1.2] font-semibold">{title}</b>
        <span className="block text-12 text-muted">{meta}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {actions.map((a) => (
            <Button key={a.label} variant={a.primary ? "primary" : "secondary"} onClick={a.run} disabled={a.busy} aria-busy={a.busy || undefined}>
              {a.label}
            </Button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => openPalette(true)}
          aria-label={t("toolbar.openCommands")}
          className="inline-flex min-h-9 items-center gap-2 rounded-ctl border border-line bg-paper px-2.5 text-12 text-muted"
        >
          <kbd className="font-[inherit] text-ink">⌘K</kbd>
        </button>
      </div>
    </header>
  );
}
