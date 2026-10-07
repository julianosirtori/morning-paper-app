import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionTitle, ViewHeader } from "../../components/ui/ViewHeader";
import { useSources } from "../../store/sources";
import { SourcesTable } from "./SourcesTable";
import { SourceActionsMenu } from "./SourceActionsMenu";
import { RemoveSourceDialog } from "./RemoveSourceDialog";
import { EmptySources } from "./EmptySources";
import { LocalNewsForm } from "./LocalNewsForm";
import { toast } from "../../store/toasts";

const focusAfterRender = (selector: string, fallback?: string) =>
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(selector) ?? (fallback ? document.querySelector<HTMLElement>(fallback) : null);
    el?.focus();
  });

export function SourcesView() {
  const { t } = useTranslation();
  const sources = useSources((s) => s.sources);
  const add = useSources((s) => s.add);
  const [menu, setMenu] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const closeMenu = useCallback((refocus: boolean) => {
    setMenu((m) => {
      if (m && refocus) m.anchor.focus();
      return null;
    });
  }, []);

  const closeRemove = (removed: boolean) => {
    const i = sources.findIndex((s) => s.id === removing);
    setRemoving(null);
    // Depois de remover, o foco vai para a linha seguinte (ou para "Adicionar fontes")
    focusAfterRender(`[data-menu="${removed ? Math.min(i, sources.length - 2) : i}"]`, "[data-open-add]");
  };

  return (
    <>
      <ViewHeader eyebrow={t("sources.eyebrow")} title={t("sources.title")} titleId="h-fontes" lead={t("sources.lead")} />
      {sources.length ? (
        <SourcesTable
          openMenuFor={menu?.id ?? null}
          onOpenMenu={(id, anchor) => setMenu((m) => (m?.id === id ? null : { id, anchor }))}
        />
      ) : (
        <EmptySources />
      )}
      <section aria-labelledby="h-local" className="mt-10">
        <SectionTitle id="h-local">{t("sources.local.title")}</SectionTitle>
        <LocalNewsForm
          idPrefix="src"
          existing={sources.map((s) => s.url)}
          onAdd={(s, count) => {
            add({ ...s, last: { at: new Date().toISOString(), ok: true, count } });
            toast(t("sources.toast.added", { name: s.name, count }));
          }}
        />
      </section>
      {menu && <SourceActionsMenu id={menu.id} anchor={menu.anchor} onClose={closeMenu} onRemove={() => setRemoving(menu.id)} />}
      <RemoveSourceDialog id={removing} onClose={closeRemove} />
    </>
  );
}
