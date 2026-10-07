import type { ReactNode } from "react";

/** Cabeçalho editorial de cada tela: rótulo vermelho, título serifado e texto de apoio. */
export function ViewHeader({ eyebrow, title, titleId, lead, children }: {
  eyebrow: ReactNode; title: ReactNode; titleId: string; lead: ReactNode; children?: ReactNode;
}) {
  return (
    <header className="mb-8 border-b-2 border-ink pb-6">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id={titleId} tabIndex={-1}>{title}</h1>
      <p className="lead">{lead}</p>
      {children}
    </header>
  );
}

export function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return <h2 className="section-title" id={id}>{children}</h2>;
}
