import clsx from "clsx";
import type { ReactNode } from "react";

type Props = { id?: string; titleId: string; title: string; note?: ReactNode; wide?: boolean; children: ReactNode };

/** Bloco de preferências com fio superior, título e nota opcional. */
export function PrefSection({ id, titleId, title, note, wide, children }: Props) {
  return (
    <section id={id} aria-labelledby={titleId} className={clsx("grid content-start gap-3 border-t-2 border-ink pt-4", wide && "col-span-full")}>
      <h2 id={titleId} className="text-20">{title}</h2>
      {note}
      {children}
    </section>
  );
}

export const Note = ({ children }: { children: ReactNode }) => <p className="note">{children}</p>;
