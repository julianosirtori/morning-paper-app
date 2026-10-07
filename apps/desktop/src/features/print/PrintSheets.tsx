import { NewspaperPage } from "../../components/newspaper/NewspaperPage";
import { usePages, useViewedEdition } from "../../hooks/useEdition";
import { longDate } from "../../lib/dates";
import { usePreferences } from "../../store/preferences";
import { usePrint } from "../../store/print";

/** Folhas que vão para o papel (ou PDF): invisíveis na tela, aparecem só em @media print. */
export function PrintSheets() {
  const doc = useViewedEdition();
  const pages = usePages(doc);
  const style = usePreferences((s) => s.style);
  const { copies, range } = usePrint();
  if (!doc) return null;
  const indexes = range === "front" ? [0] : pages.map((_, i) => i);
  return (
    <div className="print-root" aria-hidden="true">
      {Array.from({ length: copies }, (_, c) =>
        indexes.map((i) => <NewspaperPage key={`${c}-${i}`} pages={pages} index={i} n={doc.n} date={longDate(doc.date)} style={style} />),
      )}
    </div>
  );
}
