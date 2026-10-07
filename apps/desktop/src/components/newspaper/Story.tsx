import clsx from "clsx";
import type { Story as StoryData } from "../../data/types";
import { HalftoneImage } from "./HalftoneImage";

/**
 * Matéria curta do jornal: chapéu, título, foto e parágrafos, ou uma lista numerada (que nunca é escondida).
 * `data-fit`/`data-trim` marcam o que o encaixe da página pode esconder ou cortar (hooks/useFitPage).
 */
export function Story({ story: s, className }: { story: StoryData; className?: string }) {
  const paragraphs = s.list ? [] : Array.isArray(s.p) ? s.p : [s.p ?? ""];
  return (
    <section className={clsx("np-story", className)} data-fit={s.list ? undefined : ""} data-short={s.short}>
      {s.kicker && <div className="np-story-kicker">{s.kicker}</div>}
      <h3>{s.h}</h3>
      {s.img && (
        <figure className="np-story-fig">
          <HalftoneImage kind={s.img.k} src={s.img.src} alt={s.img.alt} />
        </figure>
      )}
      {s.list ? (
        <ol className="np-list">{s.list.map((x) => <li key={x}>{x}</li>)}</ol>
      ) : (
        paragraphs.filter(Boolean).map((p, i) => <p key={i} data-trim data-full={p}>{p}</p>)
      )}
    </section>
  );
}
