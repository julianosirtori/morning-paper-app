import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../components/ui/Modal";
import { normalize } from "../../lib/format";
import { useUi } from "../../store/ui";
import { useCommands } from "./useCommands";

function PaletteContent({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const commands = useCommands();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const items = commands.filter((c) => normalize(c.label).includes(normalize(query.trim())));
  const current = Math.min(selected, Math.max(0, items.length - 1));
  useEffect(() => { listRef.current?.querySelector(`#pal-${current}`)?.scrollIntoView({ block: "nearest" }); }, [current]);

  const run = (i: number) => {
    const c = items[i];
    if (!c) return;
    onClose();
    c.run();
  };

  return (
    <>
      <input
        type="text" placeholder={t("palette.placeholder")} aria-label={t("palette.search")} role="combobox" aria-expanded="true"
        aria-controls="pal-list" aria-autocomplete="list" autoComplete="off" data-autofocus
        aria-activedescendant={items.length ? `pal-${current}` : undefined}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
        onKeyDown={(e) => {
          const n = Math.max(1, items.length);
          if (e.key === "ArrowDown") { e.preventDefault(); setSelected((current + 1) % n); }
          if (e.key === "ArrowUp") { e.preventDefault(); setSelected((current - 1 + n) % n); }
          if (e.key === "Enter") { e.preventDefault(); run(current); }
        }}
        className="min-h-[52px] rounded-none border-0 border-b border-line bg-transparent px-4 text-16 focus-visible:border-ink focus-visible:outline-0"
      />
      <ul ref={listRef} id="pal-list" role="listbox" aria-label={t("palette.label")} className="max-h-80 overflow-auto p-1.5">
        {items.length ? items.map((c, i) => (
          <li
            key={c.label} id={`pal-${i}`} role="option" aria-selected={i === current}
            onClick={() => run(i)} onMouseMove={() => i !== current && setSelected(i)}
            className={clsx("flex cursor-pointer justify-between gap-3 rounded-[5px] px-3 py-2.5", i === current && "bg-ink text-on-ink")}
          >
            {c.label}
            <span className={clsx("text-12", i === current ? "text-on-ink" : "text-muted")}>{c.hint}</span>
          </li>
        )) : (
          <li role="option" aria-disabled="true" aria-selected="false" className="cursor-default px-3 py-2.5 text-muted">{t("palette.empty", { query })}</li>
        )}
      </ul>
    </>
  );
}

/** Paleta de comandos (⌘K): busca sem acento, setas e Enter. */
export function CommandPalette() {
  const { t } = useTranslation();
  const open = useUi((s) => s.paletteOpen);
  const setOpen = useUi((s) => s.setPaletteOpen);
  return (
    <Modal open={open} onClose={() => setOpen(false)} className="palette" aria-label={t("palette.label")} closeOnBackdrop>
      <PaletteContent onClose={() => setOpen(false)} />
    </Modal>
  );
}
