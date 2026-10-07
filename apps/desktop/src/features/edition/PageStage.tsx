import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { EditionDoc } from "../../data/types";
import { NewspaperPage } from "../../components/newspaper/NewspaperPage";
import { usePages } from "../../hooks/useEdition";
import { longDate } from "../../lib/dates";
import { usePreferences } from "../../store/preferences";
import { useReader } from "../../store/reader";

/** Mesa de leitura: a página atual, com zoom, e as setas ← → para folhear. */
export function PageStage({ doc }: { doc: EditionDoc }) {
  const { t } = useTranslation();
  const pages = usePages(doc);
  const { page, setPage, zoom } = useReader();
  const style = usePreferences((s) => s.style);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: 0, left: 0 }); }, [page]);
  const current = Math.min(page, pages.length - 1);
  return (
    <div
      ref={ref}
      tabIndex={0}
      aria-label={t("edition.stage")}
      className="overflow-auto border border-line bg-panel p-6 [container-type:inline-size]"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); setPage(current + 1, pages.length); }
        if (e.key === "ArrowLeft") { e.preventDefault(); setPage(current - 1, pages.length); }
      }}
    >
      <NewspaperPage pages={pages} index={current} n={doc.n} date={longDate(doc.date)} style={style} className="mx-auto" css={{ width: `calc(min(680px, 100cqi) * ${zoom})` }} />
    </div>
  );
}
