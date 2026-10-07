import { useTranslation } from "react-i18next";
import { SectionTitle } from "../../components/ui/ViewHeader";
import { longDate } from "../../lib/dates";
import { useEditions } from "../../store/editions";
import { useReader } from "../../store/reader";
import { useNavigation } from "../../store/navigation";

/** Edições anteriores: abre a edição escolhida na tela Edição. */
export function EditionHistory() {
  const { t } = useTranslation();
  // Seleciona o array guardado e corta aqui: um seletor que devolve array novo a cada leitura
  // (s.editions.slice(…)) faz o React renderizar em laço e a tela fica em branco.
  const history = useEditions((s) => s.editions).slice(1, 15);
  const open = useReader((s) => s.open);
  const go = useNavigation((s) => s.go);
  return (
    <aside aria-labelledby="h-hist">
      <SectionTitle id="h-hist">{t("print.history")}</SectionTitle>
      <ul>
        {history.length === 0 && <li className="note py-3">{t("print.noHistory")}</li>}
        {history.map((h) => (
          <li key={h.n} className="border-b border-line">
            <button
              type="button"
              onClick={() => { open(h.n); go("edicao"); }}
              className="group flex min-h-12 w-full items-baseline justify-between gap-3 py-3 text-left font-serif text-16 leading-[1.3] font-semibold"
            >
              <b className="underline-offset-4 group-hover:underline">{longDate(h.date)}</b>
              <span className="font-sans text-13 font-normal whitespace-nowrap text-muted">{t("print.historyItem", { n: h.n, count: h.stories.filter((s) => s.inc).length })}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
