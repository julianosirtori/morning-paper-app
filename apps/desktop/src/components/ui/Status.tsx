import clsx from "clsx";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

const TONES = { ok: "text-ok", err: "text-accent", muted: "text-muted" } as const;

/** Situação sempre com texto e ícone — nunca só pela cor. */
export function Status({ tone, icon, children }: { tone: keyof typeof TONES; icon: IconName; children: ReactNode }) {
  return (
    <span className={clsx("st", TONES[tone])}>
      <Icon name={icon} />
      {children}
    </span>
  );
}
