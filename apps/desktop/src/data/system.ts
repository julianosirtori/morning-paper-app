import type { Agent, Printer } from "./types";

/* No app (Tauri) a lista vem do sistema: CUPS para impressoras e o PATH do shell para os CLIs.
   No navegador (pnpm dev) usamos estes exemplos do protótipo. */
export const PDF_PRINTER: Printer = { id: "pdf", name: "PDF", status: "pdf" };
export const SAMPLE_PRINTERS: Printer[] = [
  { id: "Office_Printer", name: "Office Printer", info: "Brother HL-L2350DW", connection: "network", status: "ready" },
  { id: "HP_LaserJet_M110w", name: "HP LaserJet M110w", connection: "usb", status: "offline" },
];

export const AGENTS: Agent[] = [
  { id: "claude", name: "Claude Code", cmd: "claude", path: null, found: false },
  { id: "codex", name: "Codex CLI", cmd: "codex", path: null, found: false },
  { id: "gemini", name: "Gemini CLI", cmd: "gemini", path: null, found: false },
  { id: "ollama", name: "Ollama", cmd: "ollama", path: null, found: false },
  { id: "opencode", name: "OpenCode", cmd: "opencode", path: null, found: false },
  { id: "none", name: "", cmd: null, path: null, found: true },
];
export const SAMPLE_AGENT_PATHS: Record<string, string | null> = {
  claude: "/opt/homebrew/bin/claude", codex: "/usr/local/bin/codex", gemini: null, ollama: "/usr/local/bin/ollama", opencode: null,
};
