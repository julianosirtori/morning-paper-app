import clsx from "clsx";
import { useTranslation } from "react-i18next";
import type { EditionDoc } from "../../data/types";
import { usePages } from "../../hooks/useEdition";
import { useReader } from "../../store/reader";

export function PageThumbnails({ doc }: { doc: EditionDoc }) {
  const { t } = useTranslation();
  const pages = usePages(doc);
  const page = useReader((s) => s.page);
  const setPage = useReader((s) => s.setPage);
  return (
    <nav className="grid gap-3" aria-label={t("edition.pagesNav")}>
      {pages.map((p, i) => (
        <button
          key={i}
          type="button"
          aria-current={i === page}
          aria-label={t("edition.thumb", { page: i + 1, section: p.section })}
          onClick={() => setPage(i, pages.length)}
          className={clsx(
            "flex aspect-[1/1.414] w-full flex-col gap-1.5 rounded-[2px] bg-np-paper text-left",
            i === page ? "border-2 border-ink p-[7px]" : "border border-line-strong p-2",
          )}
        >
          <b className="font-serif text-13 leading-none font-bold">{String(i + 1).padStart(2, "0")}</b>
          <span className="line-clamp-3 text-12 leading-[1.2] text-muted">{p.section}</span>
          <i className="flex-1 bg-[repeating-linear-gradient(180deg,var(--color-np-rule)_0_1px,transparent_1px_6px)]" />
        </button>
      ))}
    </nav>
  );
}
