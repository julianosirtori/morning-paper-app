import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button, IconButton } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { TextLink } from "../../components/ui/TextLink";
import type { EditionDoc } from "../../data/types";
import { usePages } from "../../hooks/useEdition";
import { MAX_ZOOM, MIN_ZOOM, useReader } from "../../store/reader";
import { usePreferences } from "../../store/preferences";

const Block = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-2 border-b border-line py-3 max-lg:flex-[1_1_180px]">{children}</div>
);
const Row = ({ children }: { children: ReactNode }) => <div className="flex items-center justify-between gap-2">{children}</div>;

export function ReaderControls({ doc }: { doc: EditionDoc }) {
  const { t } = useTranslation();
  const pages = usePages(doc);
  const { page, setPage: setPageRaw, zoom, setZoom } = useReader();
  const setPage = (i: number) => setPageRaw(i, pages.length);
  const style = usePreferences((s) => s.style);
  const prev = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const last = pages.length - 1;
  const percent = Math.round(zoom * 100);

  // Se o botão usado ficou desabilitado (primeira/última página), o foco vai para o outro
  useEffect(() => {
    if (page === 0 && document.activeElement === prev.current) next.current?.focus();
    if (page === last && document.activeElement === next.current) prev.current?.focus();
  }, [page, last]);

  return (
    <aside className="border-t-2 border-ink max-lg:col-span-full max-lg:flex max-lg:flex-wrap max-lg:gap-x-8" aria-label={t("edition.controls")}>
      <Block>
        <b className="font-semibold">{t("edition.pageOf", { page: page + 1, total: pages.length })}</b>
        <Row>
          <Button ref={prev} size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>{t("edition.previous")}</Button>
          <Button ref={next} size="sm" disabled={page === last} onClick={() => setPage(page + 1)}>{t("edition.next")}</Button>
        </Row>
      </Block>
      <Block>
        <Row>
          <label htmlFor="zoom" className="font-semibold">{t("edition.size")}</label>
          <output htmlFor="zoom">{percent}%</output>
        </Row>
        <div className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-1">
          <IconButton aria-label={t("edition.zoomOut")} disabled={zoom <= MIN_ZOOM} onClick={() => setZoom(zoom - 0.1)}><Icon name="minus" /></IconButton>
          <input type="range" id="zoom" className="w-full" min={MIN_ZOOM * 100} max={MAX_ZOOM * 100} step={10} value={percent} onChange={(e) => setZoom(+e.target.value / 100)} />
          <IconButton aria-label={t("edition.zoomIn")} disabled={zoom >= MAX_ZOOM} onClick={() => setZoom(zoom + 0.1)}><Icon name="plus" /></IconButton>
        </div>
      </Block>
      <Block>
        <b className="font-semibold">{t("edition.style")}</b>
        <Row>
          <span>{t(`styles.${style}.name`)}</span>
          <TextLink to="preferencias" focus="pref-style">{t("edition.change")}</TextLink>
        </Row>
      </Block>
    </aside>
  );
}
