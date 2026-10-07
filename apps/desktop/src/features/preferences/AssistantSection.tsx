import { useTranslation } from "react-i18next";
import type { Agent } from "../../data/types";
import { Button } from "../../components/ui/Button";
import { Status } from "../../components/ui/Status";
import { usePreferences } from "../../store/preferences";
import { useActiveAgent, useAgents, useSystem } from "../../store/system";
import { toast } from "../../store/toasts";
import { Note, PrefSection } from "./PrefSection";

type AgentId = "claude" | "codex" | "gemini" | "ollama" | "opencode" | "none";

function AgentCard({ agent: a, checked }: { agent: Agent; checked: boolean }) {
  const { t } = useTranslation();
  const set = usePreferences((s) => s.set);
  return (
    <label className="opt-card">
      <input
        type="radio" name="agent" value={a.id} checked={checked} disabled={!a.found} aria-describedby={`ag-${a.id}`}
        onChange={() => { set({ agentId: a.id }); toast(a.id === "none" ? t("prefs.toast.noAi") : t("prefs.toast.ai", { name: a.name })); }}
      />
      <b className="font-semibold">{a.name}</b>
      {a.cmd && <code className="font-mono text-12 leading-[1.3] wrap-anywhere text-muted">{a.found ? a.path : t("prefs.ai.notInPath", { cmd: a.cmd })}</code>}
      <small id={`ag-${a.id}`} className="text-12 text-muted">{a.found ? t(`prefs.ai.notes.${a.id as AgentId}`) : t("prefs.ai.notFound")}</small>
      {a.cmd && (
        <span className="mt-1">
          {a.found ? <Status tone="ok" icon="check">{t("prefs.ai.found")}</Status> : <Status tone="muted" icon="dot">{t("prefs.ai.notInstalled")}</Status>}
        </span>
      )}
    </label>
  );
}

/** Assistentes de IA de linha de comando detectados no PATH (sem chave de API). */
export function AssistantSection() {
  const { t } = useTranslation();
  const agents = useAgents();
  const active = useActiveAgent();
  const { scanningAgents, agentPaths, scanAgents } = useSystem();
  const found = agents.filter((a) => a.cmd && a.found).length;
  const searching = scanningAgents || agentPaths === null;
  return (
    <PrefSection
      wide
      id="ai-pref"
      titleId="h-p-ai"
      title={t("prefs.ai.title")}
      note={<><Note>{t("prefs.ai.note1")}</Note><Note>{t("prefs.ai.note2")}</Note></>}
    >
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="h-p-ai">
        {agents.map((a) => <AgentCard key={a.id} agent={a} checked={active.id === a.id} />)}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={scanningAgents} onClick={scanAgents}>{scanningAgents ? t("prefs.printer.scanning") : t("prefs.ai.rescan")}</Button>
        <span className="note" role="status">{searching ? t("prefs.ai.searching") : t("prefs.ai.foundCount", { count: found })}</span>
      </div>
    </PrefSection>
  );
}
