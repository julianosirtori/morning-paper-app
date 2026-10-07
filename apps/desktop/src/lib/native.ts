// Ponte com o lado nativo (Tauri / Rust). Cada função tem um equivalente para o navegador,
// assim `pnpm dev` continua funcionando como prévia sem o app de desktop.
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { PDF_PRINTER, SAMPLE_AGENT_PATHS, SAMPLE_PRINTERS } from "../data/system";
import type { Connection, Printer, Repeat } from "../data/types";
import { sampleFeeds } from "./sampleFeeds";

export const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Idioma preferido do sistema operacional (ex.: "pt-BR", "en-US"). */
export async function systemLocale(): Promise<string> {
  // Na prévia do navegador, ?lang=en (ou pt-BR) simula outro idioma do sistema.
  if (!isTauri()) return new URLSearchParams(location.search).get("lang") ?? navigator.language;
  try {
    return await invoke<string>("system_locale");
  } catch {
    return navigator.language;
  }
}

/** Caminho de cada CLI de IA encontrado no PATH do shell do usuário (null = não instalado). */
export async function detectAgents(): Promise<Record<string, string | null>> {
  if (!isTauri()) {
    await wait(600);
    return SAMPLE_AGENT_PATHS;
  }
  return invoke("detect_agents");
}

type NativePrinter = { id: string; name: string; info: string; connection: Connection; state: "idle" | "printing" | "disabled"; isDefault: boolean };
const STATUS = { idle: "ready", printing: "printing", disabled: "offline" } as const;

/** Impressoras instaladas no macOS (CUPS), mais a opção de salvar em PDF. */
export async function listPrinters(): Promise<{ printers: Printer[]; defaultId: string | null }> {
  if (!isTauri()) {
    await wait(600);
    return { printers: [...SAMPLE_PRINTERS, PDF_PRINTER], defaultId: SAMPLE_PRINTERS[0].id };
  }
  const list = await invoke<NativePrinter[]>("list_printers");
  const printers: Printer[] = list.map((p) => ({
    id: p.id,
    name: p.name,
    info: p.info !== p.name ? p.info : undefined,
    connection: p.connection,
    status: STATUS[p.state],
  }));
  return { printers: [...printers, PDF_PRINTER], defaultId: list.find((p) => p.isDefault)?.id ?? null };
}

/**
 * Abre o diálogo de impressão do macOS com as páginas montadas em `.print-root`: A4 sem margens,
 * já em preto e branco e rascunho na impressora indicada (a pessoa pode mudar no diálogo).
 */
export async function printEdition(printer?: Pick<Printer, "id" | "name">) {
  if (!isTauri()) {
    window.print();
    return;
  }
  await invoke("print_window", { printer: printer?.id ?? null, printerName: printer?.name ?? null });
}

export async function openExternal(url: string) {
  if (!isTauri()) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}

export type Background = { login: boolean; keep: boolean; wake: boolean; menubar: boolean; dock: boolean };

/** Aplica as opções de "Em segundo plano": abrir no login, fechar sem encerrar, ícone na barra de menus e Dock. */
export async function applyBackground(bg: Background) {
  if (!isTauri()) return;
  await invoke("set_background", { keepRunning: bg.keep, showTray: bg.menubar, hideDock: bg.menubar && bg.dock });
  try {
    const autostart = await import("@tauri-apps/plugin-autostart");
    const on = await autostart.isEnabled();
    if (bg.login && !on) await autostart.enable();
    if (!bg.login && on) await autostart.disable();
  } catch (e) {
    console.warn("autostart indisponível", e);
  }
}

export type TrayTexts = { title: string; detail: string; open: string; print: string; generate: string; pause: string; prefs: string; quit: string };

/** Atualiza os textos (traduzidos) do menu na barra de menus. */
export async function setTrayTexts(texts: TrayTexts) {
  if (!isTauri()) return;
  await invoke("set_tray_texts", { texts });
}

export type TrayAction = "open" | "print" | "generate" | "pause" | "prefs";
export async function onTrayAction(cb: (a: TrayAction) => void): Promise<UnlistenFn> {
  if (!isTauri()) return () => {};
  return listen<TrayAction>("tray-action", (e) => cb(e.payload));
}

/* ---------- Edição: coleta, IA, armazenamento, PDF e agenda ---------- */

export type FeedRawItem = { id: string; title: string; summary: string; url: string | null; published: string | null; image: string | null };
export type FeedResult = {
  id: string;
  ok: boolean;
  error: string | null;
  resolvedUrl: string | null;
  title: string | null;
  site: string | null;
  items: FeedRawItem[];
};

/** Baixa feeds RSS/Atom (no Rust, sem CORS). Aceita também o endereço de um site com feed anunciado. */
export async function fetchFeeds(feeds: { id: string; url: string }[]): Promise<FeedResult[]> {
  if (!isTauri()) {
    await wait(900);
    return sampleFeeds(feeds);
  }
  return invoke("fetch_feeds", { feeds });
}

/** Roda o assistente de IA de linha de comando com um prompt e devolve a resposta. */
export async function runAgent(agent: string, path: string, prompt: string): Promise<string> {
  if (!isTauri()) throw new Error("IA disponível só no app de desktop");
  return invoke("run_agent", { agent, path, prompt });
}

const LS_EDITIONS = "mp-editions";

export async function saveEditionFile(n: number, json: string) {
  if (!isTauri()) {
    const all = JSON.parse(localStorage.getItem(LS_EDITIONS) ?? "{}") as Record<number, string>;
    all[n] = json;
    localStorage.setItem(LS_EDITIONS, JSON.stringify(all));
    return;
  }
  await invoke("save_edition", { n, json });
}

/** Edições salvas (JSON), da mais nova para a mais antiga. */
export async function listEditionFiles(): Promise<string[]> {
  if (!isTauri()) {
    const all = JSON.parse(localStorage.getItem(LS_EDITIONS) ?? "{}") as Record<string, string>;
    return Object.keys(all).sort((a, b) => +b - +a).map((k) => all[k]);
  }
  return invoke("list_editions");
}

/** Caminho do PDF em ~/Documents/Morning Paper. */
export const pdfPath = (fileName: string) => invoke<string>("pdf_path", { fileName });

/** Gera o PDF das páginas em `.print-root`, sem diálogo. Na prévia do navegador, abre o diálogo de impressão. */
export async function exportPdf(path: string) {
  if (!isTauri()) {
    window.print();
    return;
  }
  await invoke("export_pdf", { path });
}

/** Envia um PDF para a impressora (fila do CUPS), sem diálogo. */
export const printPdf = (path: string, printer: string, copies: number) => invoke("print_pdf", { path, printer, copies });

export async function revealInFinder(path: string) {
  if (!isTauri()) return;
  const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
  await revealItemInDir(path);
}

export type Schedule = { enabled: boolean; time: string; repeat: Repeat; skipDate: string | null; lastRun: string | null };

/** Informa o agendador (Rust) sobre horário, pausa e a última edição. */
export async function setSchedule(schedule: Schedule) {
  if (!isTauri()) return;
  await invoke("set_schedule", { schedule });
}

export async function onScheduledEdition(cb: (lateMinutes: number) => void): Promise<UnlistenFn> {
  if (!isTauri()) return () => {};
  return listen<{ lateMinutes: number }>("scheduled-edition", (e) => cb(e.payload.lateMinutes));
}

/** Agenda o despertar diário do Mac (pede senha de administrador). */
export async function setWake(enabled: boolean, time: string) {
  if (!isTauri()) return;
  await invoke("set_wake", { enabled, time });
}

export async function showMainWindow() {
  if (!isTauri()) return;
  await invoke("show_main_window");
}

/** Notificação do sistema (pede permissão na primeira vez). */
export async function notify(title: string, body: string) {
  if (!isTauri()) return;
  try {
    const n = await import("@tauri-apps/plugin-notification");
    let granted = await n.isPermissionGranted();
    if (!granted) granted = (await n.requestPermission()) === "granted";
    if (granted) n.sendNotification({ title, body });
  } catch (e) {
    console.warn("notificação indisponível", e);
  }
}
