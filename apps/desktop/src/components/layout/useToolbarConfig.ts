import { useTranslation } from "react-i18next";
import { usePages, useViewedEdition } from "../../hooks/useEdition";
import { saveViewedPdf } from "../../services/delivery";
import { refreshSources } from "../../services/feeds";
import { toast } from "../../store/toasts";
import { useState } from "react";
import { useEditions, useLatestEdition } from "../../store/editions";
import { useReader } from "../../store/reader";
import { useNavigation, type ViewId } from "../../store/navigation";
import { usePreferences } from "../../store/preferences";
import { usePrint } from "../../store/print";
import { useActiveSourceCount, useSources } from "../../store/sources";
import { usePrinter } from "../../store/system";
import { useUi } from "../../store/ui";
import { importOpml } from "../../features/sources/importOpml";

export type ToolbarAction = { label: string; run: () => void; primary?: boolean; busy?: boolean };
export type ToolbarConfig = { title: string; meta: string; actions: ToolbarAction[] };

/** Título, resumo e ações da barra de ferramentas para a tela atual — uma ação principal por tela. */
export function useToolbarConfig(view: ViewId): ToolbarConfig {
  const { t } = useTranslation();
  const go = useNavigation((s) => s.go);
  const latest = useLatestEdition();
  const viewed = useViewedEdition();
  const pages = usePages(viewed);
  const page = useReader((s) => s.page);
  const openEdition = useReader((s) => s.open);
  const generate = useEditions((s) => s.generate);
  const generating = useEditions((s) => s.progress !== null);
  const included = latest?.stories.filter((x) => x.inc).length ?? 0;
  const style = usePreferences((s) => s.style);
  const printer = usePrinter();
  const { printing, print } = usePrint();
  const sourceCount = useSources((s) => s.sources.length);
  const activeSources = useActiveSourceCount();
  const openAddSource = useUi((s) => s.setAddSourceOpen);
  const [checking, setChecking] = useState(false);
  const checkSources = async () => {
    setChecking(true);
    const { ok, failed } = await refreshSources();
    setChecking(false);
    toast(failed ? t("sources.toast.checkedWithErrors", { ok, failed }) : t("sources.toast.checked", { count: ok }), failed ? "err" : undefined);
  };

  switch (view) {
    case "hoje":
      return {
        title: t("nav.today"),
        meta: latest ? t("toolbar.today.meta", { n: latest.n, count: included }) : t("toolbar.today.empty"),
        actions: latest
          ? [
              { label: generating ? t("generate.running") : t("generate.again"), run: () => generate("manual"), busy: generating },
              { label: t("toolbar.today.review"), run: () => go("revisar") },
              { label: t("toolbar.today.print"), run: () => go("imprimir"), primary: true },
            ]
          : [{ label: generating ? t("generate.running") : t("generate.now"), run: () => generate("manual"), primary: true, busy: generating }],
      };
    case "edicao":
      return {
        title: t("nav.edition"),
        meta: viewed ? t("toolbar.edition.meta", { n: viewed.n, page: page + 1, total: pages.length, style: t(`styles.${style}.name`) }) : "",
        actions: viewed
          ? [
              { label: t("toolbar.edition.pdf"), run: saveViewedPdf },
              { label: t("toolbar.edition.print"), run: () => go("imprimir"), primary: true },
            ]
          : [],
      };
    case "revisar":
      return {
        title: t("nav.review"),
        meta: latest ? t("toolbar.review.meta", { included, total: latest.stories.length }) : "",
        actions: latest ? [{ label: t("toolbar.review.final"), run: () => { openEdition(null); go("edicao"); }, primary: true }] : [],
      };
    case "imprimir":
      return {
        title: t("nav.print"),
        meta: `${printer.name} · ${t(`printer.statusLower.${printer.status}`)}`,
        actions: [
          { label: t("toolbar.print.pdf"), run: saveViewedPdf, busy: !viewed },
          { label: printing ? t("toolbar.print.sending") : t("toolbar.print.now"), run: () => print(printer), primary: true, busy: printing || !viewed },
        ],
      };
    case "fontes":
      return {
        title: t("nav.sources"),
        meta: t("toolbar.sources.meta", { active: activeSources, total: sourceCount }),
        actions: [
          { label: checking ? t("sources.add.checking") : t("toolbar.sources.check"), run: checkSources, busy: checking || !sourceCount },
          { label: t("toolbar.sources.import"), run: importOpml },
          { label: t("toolbar.sources.add"), run: () => openAddSource(true), primary: true },
        ],
      };
    case "preferencias":
      return { title: t("nav.preferences"), meta: t("toolbar.preferences.meta"), actions: [] };
  }
}
