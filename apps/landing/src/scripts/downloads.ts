// Página de downloads: mostra se o computador de quem visita é compatível.
import { $ } from "./dom";
import { describeEnv, detectEnv, reasonOf, verdictOf, type Env } from "./platform";

const MIN_MACOS = 11;

function platformId(env: Env): string | undefined {
  if (env.os === "mac") return env.arch === "x86" ? "mac-intel" : "mac-arm";
  if (env.os === "windows" || env.os === "linux") return env.os;
  return undefined;
}

detectEnv().then((env) => {
  const verdict = verdictOf(env, MIN_MACOS);
  const title = $("[data-env-title]");
  const text = $("[data-env-text]");

  if (verdict === "ok") {
    title.textContent = `${describeEnv(env)}: compatível.`;
    text.textContent = "Baixe o instalador e siga os passos abaixo.";
  } else if (verdict === "maybe") {
    title.textContent = "Você está em um Mac.";
    text.textContent = "Ele é compatível se tiver chip Apple (M1 ou mais recente). Confira em Menu Apple › Sobre este Mac.";
  } else {
    title.textContent = `${describeEnv(env)}: ainda não compatível.`;
    text.textContent = reasonOf(env, MIN_MACOS);
  }
  text.hidden = false;
  $("[data-env-ok]").hidden = verdict === "no";
  $("[data-env-no]").hidden = verdict !== "no";

  const id = platformId(env);
  const row = id ? document.querySelector<HTMLElement>(`[data-plat="${id}"]`) : null;
  if (row) {
    row.classList.add("is-you");
    $(".plat-you", row).hidden = false;
  }
});

/* Copiar o link da página */
const urlField = $<HTMLInputElement>("#page-url");
const copyStatus = $("#copy-status");
urlField.addEventListener("focus", () => urlField.select());
$("#copy-btn").addEventListener("click", async () => {
  let copied = false;
  try {
    await navigator.clipboard.writeText(urlField.value);
    copied = true;
  } catch {
    urlField.select();
  }
  copyStatus.innerHTML = copied
    ? '<svg class="i" aria-hidden="true"><use href="#i-check"/></svg><span>Link copiado. Abra no seu Mac para baixar.</span>'
    : "<span>Não deu para copiar sozinho. O link está selecionado: use Copiar do seu aparelho.</span>";
  copyStatus.hidden = false;
});

