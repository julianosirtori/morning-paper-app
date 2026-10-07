import type { InputHTMLAttributes, ReactNode } from "react";

/** Rádio ou caixa de seleção com o rótulo ao lado. */
export function Choice({ children, ...input }: InputHTMLAttributes<HTMLInputElement> & { children: ReactNode }) {
  return (
    <label className="flex min-h-8 items-center gap-2">
      <input className="m-0 size-4" {...input} /> {children}
    </label>
  );
}
