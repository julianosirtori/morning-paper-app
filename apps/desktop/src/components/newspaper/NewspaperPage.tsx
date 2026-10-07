import clsx from "clsx";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Img, LayoutId, Lead, PageData, StyleId, Story as StoryData } from "../../data/types";
import { useFitPage } from "../../hooks/useFitPage";
import { HalftoneImage } from "./HalftoneImage";
import { Story } from "./Story";

type Props = {
  pages: PageData[];
  index: number;
  /** Número e data (já formatada) da edição. */
  n: number;
  date: string;
  style: StyleId;
  className?: string;
  css?: CSSProperties;
};

function Masthead({ n, date, total }: { n: number; date: string; total: number }) {
  const { t } = useTranslation();
  return (
    <>
      <header className="np-mast">
        <span className="np-ear"><span>{t("newspaper.privatePaper")}</span><span>{t("newspaper.bwA4")}</span></span>
        <b>Morning Paper</b>
        <span className="np-ear np-ear-r"><span>{t("newspaper.editionNumber", { n })}</span><span>{t("newspaper.pageCount", { count: total })}</span></span>
      </header>
      <p className="np-dateline"><span>{date}</span><span>{t("newspaper.dateline")}</span></p>
    </>
  );
}

function SectionHead({ n, date, section, number }: { n: number; date: string; section: string; number: number }) {
  const { t } = useTranslation();
  return (
    <>
      <header className="np-sechead"><b>Morning Paper</b><span>{section}</span></header>
      <p className="np-dateline"><span>{date}</span><span>{t("newspaper.editionPage", { n, page: number })}</span></p>
    </>
  );
}

export function Figure({ img, className }: { img: Img; className?: string }) {
  return (
    <figure className={clsx("np-fig", className)}>
      <HalftoneImage kind={img.k} src={img.src} alt={img.alt} />
      {img.cap && <figcaption className="np-cap">{img.cap}</figcaption>}
    </figure>
  );
}

function LeadHead({ lead }: { lead: Lead }) {
  return (
    <div className="np-lead-head">
      <p className="np-kicker">{lead.kicker}</p>
      <h2 className="np-head">{lead.head}</h2>
      {lead.sub && <p className="np-sub">{lead.sub}</p>}
      <p className="np-byline">{lead.byline}</p>
    </div>
  );
}

/**
 * Área em colunas (hooks/columnFlow.ts): o conteúdo fica escondido em .np-src e é copiado para as
 * colunas de .np-cols já encaixado. O número de colunas vem do CSS (--cols).
 */
function Flow({ className, items, children }: { className: string; items?: boolean; children: ReactNode }) {
  return (
    <div className={clsx("np-flow", className)} data-flow={items ? "items" : "text"}>
      <div className="np-src" aria-hidden="true">{children}</div>
      <div className="np-cols" />
    </div>
  );
}

/** Texto corrido da principal em colunas; "Leia também" completa a área quando o texto acaba antes. */
function LeadText({ paragraphs, fill = [] }: { paragraphs: string[]; fill?: StoryData[] }) {
  return (
    <Flow className="np-text">
      {paragraphs.map((x, k) => <p key={k}>{x}</p>)}
      {fill.map((s, k) => <Story key={`f${k}`} story={s} className="np-story--fill" />)}
    </Flow>
  );
}

/**
 * Principal completa: título, foto e texto. Com `figSide`, a foto fica ao lado do texto e ocupa a altura toda
 * da área (sobra mais altura para as colunas); sem ela, a foto fica em cima, no formato de `figClass`.
 */
function LeadBlock({ lead, fill, figClass, figSide, className }: { lead: Lead; fill?: StoryData[]; figClass?: string; figSide?: "left" | "right"; className?: string }) {
  return (
    <div className={clsx("np-lead-main", className)}>
      <LeadHead lead={lead} />
      {figSide && lead.img ? (
        <div className={clsx("np-lead-row", `np-lead-row--${figSide}`)}>
          <Figure img={lead.img} className="np-fig--fill" />
          <LeadText paragraphs={lead.lead} fill={fill} />
        </div>
      ) : (
        <>
          {lead.img && <Figure img={lead.img} className={figClass} />}
          <LeadText paragraphs={lead.lead} fill={fill} />
        </>
      )}
    </div>
  );
}

function Side({ label, stories, className }: { label: string; stories: StoryData[]; className?: string }) {
  if (!stories.length) return null;
  return (
    <aside className={clsx("np-side", className)} data-slot>
      <p className="np-side-label">{label}</p>
      {stories.map((s, i) => <Story key={i} story={s} />)}
    </aside>
  );
}

function More({ stories, className }: { stories: StoryData[]; className?: string }) {
  if (!stories.length) return null;
  return <Flow className={clsx("np-more", className)}>{stories.map((s, i) => <Story key={i} story={s} />)}</Flow>;
}

function Briefs({ briefs, className }: { briefs: NonNullable<PageData["briefs"]>; className?: string }) {
  const { t } = useTranslation();
  return (
    <section className={clsx("np-briefs", className)}>
      <p className="np-briefs-label">{t("newspaper.briefs")}</p>
      <Flow className="np-briefs-grid" items>{briefs.map((b, i) => <p key={i}><b>{b.h}.</b> {b.p}</p>)}</Flow>
    </section>
  );
}

/** Corpo da página conforme o diagrama. Cada área tem altura fixa (grid em styles.css › .np-body--*). */
function Body({ p, layout }: { p: PageData; layout: LayoutId }) {
  switch (layout) {
    case "front":
      return (
        <>
          <LeadBlock lead={p} fill={p.fill} figSide="left" className="np-a-main" />
          <Side label={p.sideLabel} stories={p.side} className="np-a-side" />
          <More stories={p.more} className="np-a-more" />
          {p.briefs && <Briefs briefs={p.briefs} className="np-a-briefs" />}
        </>
      );
    case "banner":
      return (
        <>
          <div className="np-a-head"><LeadHead lead={p} /></div>
          {p.img && <Figure img={p.img} className="np-fig--fill np-a-fig" />}
          <div className="np-a-main"><LeadText paragraphs={p.lead} fill={p.fill} /></div>
          {[0, 1, 2, 3].filter((i) => p.more[i]).map((i) => (
            // Duas matérias por coluna: a segunda ocupa o espaço que sobrar embaixo da primeira.
            <div key={i} className="np-strip-col" style={{ gridArea: `s${i + 1}` }} data-slot>
              {[p.more[i], p.more[i + 4]].filter(Boolean).map((s, k) => <Story key={k} story={s} />)}
            </div>
          ))}
          {p.briefs && <Briefs briefs={p.briefs} className="np-a-briefs" />}
        </>
      );
    case "rail":
      return (
        <>
          <Side label={p.sideLabel} stories={p.side} className="np-a-side" />
          <LeadBlock lead={p} fill={p.fill} figSide="right" className="np-a-main" />
          <More stories={p.more} className="np-a-more" />
        </>
      );
    case "split":
      return (
        <>
          <LeadBlock lead={p} fill={p.fill} className="np-a-main" />
          {p.second && <LeadBlock lead={p.second} fill={p.second.fill} className="np-a-second" />}
          <More stories={p.more} className="np-a-more" />
          <Side label={p.sideLabel} stories={p.side} className="np-a-side np-side--briefs" />
        </>
      );
    default:
      return (
        <>
          <LeadBlock lead={p} fill={p.fill} figClass="np-fig--wide" className="np-a-main" />
          <Side label={p.sideLabel} stories={p.side} className="np-a-side" />
          <More stories={p.more} className="np-a-more" />
        </>
      );
  }
}

/** Uma página do jornal, estritamente em preto e branco, em proporção A4 (estilos em styles.css › .np-*). */
export function NewspaperPage({ pages, index, n, date, style, className, css }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLElement>(null);
  const p = pages[index];
  const isFront = index === 0;
  // "split" sem segunda principal vira "classic"; páginas sem matérias laterais ocupam a largura toda.
  let layout: LayoutId = p?.layout ?? (isFront ? "front" : "classic");
  if (layout === "split" && !p?.second) layout = "classic";
  useFitPage(ref, [p, layout, style]);
  if (!p) return null;
  return (
    <article
      ref={ref}
      className={clsx("page", isFront && "np-front", className)}
      style={css}
      data-style={style}
      aria-label={t("newspaper.pageLabel", { page: index + 1, total: pages.length, section: p.section })}
    >
      <div className="page-in">
        {isFront ? <Masthead n={n} date={date} total={pages.length} /> : <SectionHead n={n} date={date} section={p.section} number={index + 1} />}
        <div className={clsx("np-body", `np-body--${layout}`, !p.side.length && "np-body--noside", !p.more.length && "np-body--nomore", !p.briefs && "np-body--nobriefs")}>
          <Body p={p} layout={layout} />
        </div>
        <footer className="np-foot">
          <span>{t("newspaper.footer")}</span>
          <span>{String(index + 1).padStart(2, "0")}</span>
        </footer>
      </div>
    </article>
  );
}
