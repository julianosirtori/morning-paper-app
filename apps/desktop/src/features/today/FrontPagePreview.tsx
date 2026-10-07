import { useTranslation } from "react-i18next";
import type { EditionDoc } from "../../data/types";
import { NewspaperPage } from "../../components/newspaper/NewspaperPage";
import { usePages } from "../../hooks/useEdition";
import { longDate } from "../../lib/dates";
import { useNavigation } from "../../store/navigation";
import { usePreferences } from "../../store/preferences";
import { useReader } from "../../store/reader";

/** Capa da edição no estilo escolhido; clicar abre a edição para ler. */
export function FrontPagePreview({ doc }: { doc: EditionDoc }) {
  const { t } = useTranslation();
  const pages = usePages(doc);
  const open = useReader((s) => s.open);
  const go = useNavigation((s) => s.go);
  const style = usePreferences((s) => s.style);
  return (
    <div>
      <a
        href="#edicao"
        aria-label={t("today.openFront")}
        onClick={(e) => { e.preventDefault(); open(doc.n); go("edicao"); }}
        className="group block rounded-[2px] transition-transform duration-180 ease-out-soft hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
      >
        <NewspaperPage pages={pages} index={0} n={doc.n} date={longDate(doc.date)} style={style} className="transition-shadow duration-180 ease-out-soft group-hover:shadow-lift" />
      </a>
      <p className="mt-3 flex flex-wrap justify-between gap-x-3 gap-y-1 text-13 text-muted">
        <span>{t("today.frontHint", { count: pages.length })}</span>
        <span className="whitespace-nowrap">{t("today.styleLabel", { style: t(`styles.${style}.name`) })}</span>
      </p>
    </div>
  );
}
