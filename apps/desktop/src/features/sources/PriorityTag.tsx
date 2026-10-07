import clsx from "clsx";
import { useTranslation } from "react-i18next";
import type { Priority } from "../../data/types";

export function PriorityTag({ priority }: { priority: Priority }) {
  const { t } = useTranslation();
  return (
    <span
      className={clsx(
        "inline-block rounded-ctl border px-2 py-0.5 text-12 font-semibold",
        priority === "high" ? "border-ink bg-ink text-on-ink" : "border-line-strong",
      )}
    >
      {t(`priority.${priority}`)}
    </span>
  );
}
