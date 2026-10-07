import { useTranslation } from "react-i18next";
import type { Source } from "../../data/types";
import { Status } from "../../components/ui/Status";
import { clock } from "../../lib/dates";
import { sourceStatus } from "../../store/sources";

const LOOK = {
  ok: { tone: "ok", icon: "dot" },
  new: { tone: "muted", icon: "dot" },
  paused: { tone: "muted", icon: "pause" },
  error: { tone: "err", icon: "alert" },
} as const;

export function SourceStatus({ source }: { source: Source }) {
  const { t } = useTranslation();
  const status = sourceStatus(source);
  const { tone, icon } = LOOK[status];
  const label = status === "error" ? t("sources.status.error", { time: clock(source.last!.at) }) : t(`sources.status.${status}`);
  return (
    <span title={status === "error" ? source.last?.error : undefined}>
      <Status tone={tone} icon={icon}>{label}</Status>
    </span>
  );
}
