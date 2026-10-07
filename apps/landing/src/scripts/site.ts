// Comportamentos comuns às páginas: data de hoje, cabeçalho, botões de download e diálogo.
import { $, $$, reduceMotion } from "./dom";
import { detectEnv, shortReasonOf, verdictOf, type Env, type Verdict } from "./platform";

const MIN_MACOS = 11;

/* Data de hoje no estilo jornal */
const now = new Date();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const long = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);
const short = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(now);
$$("[data-today]").forEach((el) => (el.textContent = cap(long)));
$$("[data-today-short]").forEach((el) => (el.textContent = cap(short)));
$$("[data-year]").forEach((el) => (el.textContent = String(now.getFullYear())));

/* Borda do cabeçalho ao rolar */
const header = $(".site-header");
new IntersectionObserver(([e]) => header.classList.toggle("is-stuck", !e.isIntersecting)).observe($("#sentinel"));

/* Diálogo de instalação (só para Macs compatíveis) */
const dlg = $<HTMLDialogElement>("#dl");
let opener: HTMLElement | null = null;
const closeDlg = () => {
  if (!dlg.open) return;
  if (reduceMotion) return dlg.close();
  dlg.classList.add("closing");
  setTimeout(() => {
    dlg.classList.remove("closing");
    dlg.close();
  }, 140);
};
dlg.addEventListener("close", () => opener?.focus());
dlg.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeDlg();
});
dlg.addEventListener("click", (e) => {
  if (e.target === dlg) closeDlg();
});
$$("[data-close]", dlg).forEach((b) => b.addEventListener("click", closeDlg));

/* Botões de download: o rótulo e o destino dependem do computador */
function applyEnv(env: Env, verdict: Verdict) {
  const canInstall = verdict !== "no";
  document.documentElement.dataset.env = verdict;
  $$("[data-download]").forEach((btn) => {
    $("[data-label-mac]", btn).hidden = !canInstall;
    $("[data-label-other]", btn).hidden = canInstall;
  });
  $("[data-env-maybe]", dlg).hidden = verdict !== "maybe";

  const note = document.querySelector<HTMLElement>("[data-env-note]");
  if (note && !canInstall) {
    note.textContent = shortReasonOf(env, MIN_MACOS);
    note.hidden = false;
  }
  document.dispatchEvent(new CustomEvent("env", { detail: { env, verdict } }));
}

let verdict: Verdict = "no";
$$("[data-download]").forEach((btn) =>
  btn.addEventListener("click", (e) => {
    if (verdict === "no") return; // segue o link para /downloads
    e.preventDefault();
    opener = btn;
    dlg.showModal();
    requestAnimationFrame(() => $("#dmg-btn").focus());
  }),
);

detectEnv().then((env) => {
  verdict = verdictOf(env, MIN_MACOS);
  applyEnv(env, verdict);
});
