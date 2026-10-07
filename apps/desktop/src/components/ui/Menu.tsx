import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Props = {
  anchor: HTMLElement;
  /** refocus = devolver o foco ao botão que abriu o menu */
  onClose: (refocus: boolean) => void;
  label: string;
  children: ReactNode;
};

/** Menu flutuante ancorado a um botão: setas, Home/End, Esc/Tab, fecha ao rolar ou clicar fora. */
export function Menu({ anchor, onClose, label, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const m = ref.current!;
    const r = anchor.getBoundingClientRect();
    m.style.left = Math.max(8, r.right - m.offsetWidth) + "px";
    m.style.top = (r.bottom + 4 + m.offsetHeight > innerHeight ? Math.max(8, r.top - 4 - m.offsetHeight) : r.bottom + 4) + "px";
    m.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
  }, [anchor]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !anchor.contains(t)) onClose(false);
    };
    const onScroll = () => onClose(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [anchor, onClose]);

  return (
    <div
      ref={ref}
      className="menu"
      role="menu"
      aria-label={label}
      onKeyDown={(e) => {
        const items = [...ref.current!.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
        const i = items.indexOf(document.activeElement as HTMLElement);
        const focus = (n: number) => { e.preventDefault(); items[(n + items.length) % items.length].focus(); };
        if (e.key === "ArrowDown") focus(i + 1);
        if (e.key === "ArrowUp") focus(i - 1);
        if (e.key === "Home") focus(0);
        if (e.key === "End") focus(items.length - 1);
        if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); onClose(true); }
      }}
    >
      {children}
    </div>
  );
}

export function MenuItem({ danger, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return <button type="button" role="menuitem" className={clsx(danger && "is-danger", className)} {...rest} />;
}

export function MenuItemRadio({ checked, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { checked: boolean }) {
  return <button type="button" role="menuitemradio" aria-checked={checked} {...rest} />;
}

export const MenuGroup = ({ children }: { children: ReactNode }) => <div className="menu-group">{children}</div>;
export const MenuLabel = ({ children }: { children: ReactNode }) => <div className="menu-label">{children}</div>;
