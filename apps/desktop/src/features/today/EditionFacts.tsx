import { useTranslation } from "react-i18next";
import type { EditionDoc } from "../../data/types";
import { Fact, Facts } from "../../components/ui/Facts";
import { SectionTitle } from "../../components/ui/ViewHeader";
import { usePages } from "../../hooks/useEdition";
import { useActiveSourceCount } from "../../store/sources";
import { usePrinter } from "../../store/system";

export function EditionFacts({ doc }: { doc: EditionDoc }) {
  const { t } = useTranslation();
  const pages = usePages(doc).length;
  const included = doc.stories.filter((s) => s.inc).length;
  const sources = useActiveSourceCount();
  const printer = usePrinter();
  return (
    <section aria-labelledby="h-facts">
      <SectionTitle id="h-facts">{t("today.factsTitle")}</SectionTitle>
      <Facts>
        <Fact label={t("today.facts.pages")}>{t("today.facts.pagesValue", { count: pages })}</Fact>
        <Fact label={t("today.facts.articles")}>{t("today.facts.articlesValue", { count: included })}</Fact>
        <Fact label={t("today.facts.sources")}>{t("today.facts.sourcesValue", { count: sources })}</Fact>
        <Fact label={t("today.facts.assistant")}>{doc.assistant ?? t("prefs.ai.none")}</Fact>
        <Fact label={t("today.facts.printer")}>{printer.name}</Fact>
      </Facts>
    </section>
  );
}
