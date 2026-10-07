import clsx from "clsx";
import { useState } from "react";
import type { ImgKind } from "../../data/types";

type Props = { kind: ImgKind; src?: string; alt: string; className?: string };

/**
 * Imagem do jornal: a foto do feed impressa em preto e branco com retícula (meio-tom) por cima;
 * sem foto (ou se ela não carregar), uma ilustração em retícula.
 */
export function HalftoneImage({ kind, src, alt, className }: Props) {
  const [failed, setFailed] = useState(false);
  const photo = src && !failed;
  return (
    <div className={clsx("np-img", !photo && `np-img--${kind}`, photo && "np-img--photo", className)} role="img" aria-label={alt || undefined}>
      {photo && <img src={src} alt="" loading="eager" referrerPolicy="no-referrer" onError={() => setFailed(true)} />}
    </div>
  );
}
