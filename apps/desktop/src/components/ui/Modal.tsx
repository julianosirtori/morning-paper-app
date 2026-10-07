import clsx from "clsx";
import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Fecha ao clicar no fundo escurecido. */
  closeOnBackdrop?: boolean;
};

/** <dialog> nativo controlado pelo React: foco preso, Esc fecha, fundo escurecido.
 *  Use `data-autofocus` (não `autoFocus`) no controle que deve receber o foco ao abrir. */
export function Modal({ open, onClose, children, className, closeOnBackdrop, ...aria }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // showModal() foca o primeiro controle; preferimos o campo marcado com data-autofocus
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={clsx("modal-box", className)}
      {...aria}
      onClose={onClose}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (closeOnBackdrop && e.target === ref.current) onClose(); }}
    >
      {open && children}
    </dialog>
  );
}

export function ModalHeader({ children }: { children: ReactNode }) {
  return <div className="flex items-start justify-between gap-3 border-b-2 border-ink pb-3">{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2 pt-2">{children}</div>;
}
