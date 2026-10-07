// Encaixe da página do jornal: cada área tem altura fixa e recebe mais texto do que cabe.
// Áreas em colunas ([data-flow]) são montadas em hooks/columnFlow.ts; as demais ([data-slot]) aqui.
// Aqui medimos o DOM e escondemos as matérias que sobram ([data-fit], da última para a primeira).
// A primeira que não coube inteira volta encurtada, mas sempre em frases completas: nunca cortada no
// meio com "…". Se nem uma frase cabe, ela usa o resumo ([data-short]); depois, perde a foto; por fim, sai.
import { useLayoutEffect, type RefObject } from "react";
import { sentences } from "../engine/text";
import { flowSlot } from "./columnFlow";

const overflows = (slot: HTMLElement) => slot.scrollHeight > slot.clientHeight + 1;

function setText(el: HTMLElement, text: string) {
  if (el.textContent !== text) el.textContent = text;
}

/** Maior número de frases inteiras do texto que cabe. Devolve false se nem a primeira cabe. */
function trimToFit(el: HTMLElement, slot: HTMLElement, text = el.dataset.full ?? ""): boolean {
  const all = sentences(text);
  let lo = 0;
  let hi = all.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    setText(el, all.slice(0, mid).join(" "));
    if (overflows(slot)) hi = mid - 1;
    else lo = mid;
  }
  setText(el, all.slice(0, lo).join(" "));
  return lo > 0;
}

/** Mostra o máximo da matéria em frases inteiras: parágrafos completos e, do próximo, as frases que couberem. */
function fitParagraphs(parts: HTMLElement[], slot: HTMLElement): boolean {
  let last = parts.length - 1;
  while (last > 0 && overflows(slot)) parts[last--].hidden = true;
  if (overflows(slot)) return trimToFit(parts[last], slot);
  const next = parts[last + 1];
  if (next) {
    next.hidden = false;
    if (!trimToFit(next, slot)) next.hidden = true;
  }
  return true;
}

/** Troca o texto da matéria pelo resumo (frases completas). */
function fallBackToSummary(item: HTMLElement, parts: HTMLElement[], slot: HTMLElement): boolean {
  const summary = item.dataset.short;
  if (!summary) return false;
  parts.forEach((p, i) => (p.hidden = i > 0));
  return trimToFit(parts[0], slot, summary);
}

/** Volta a matéria ao texto completo. */
function restore(scope: HTMLElement) {
  for (const el of scope.querySelectorAll<HTMLElement>("[data-trim]")) {
    el.hidden = false;
    setText(el, el.dataset.full ?? "");
  }
}

function fitPartial(item: HTMLElement, slot: HTMLElement): boolean {
  const parts = item.matches("[data-trim]") ? [item] : [...item.querySelectorAll<HTMLElement>("[data-trim]")];
  if (!parts.length) return false;
  if (fitParagraphs(parts, slot)) return true;
  restore(item);
  return fallBackToSummary(item, parts, slot);
}

export function fitSlot(slot: HTMLElement) {
  const items = [...slot.querySelectorAll<HTMLElement>("[data-fit]")];
  restore(slot);
  for (const el of items) el.hidden = false;
  for (const el of slot.querySelectorAll<HTMLElement>(".np-story-fig")) el.hidden = false;
  if (!overflows(slot)) return;
  let i = items.length - 1;
  while (i >= 0 && overflows(slot)) items[i--].hidden = true;
  const partial = items[i + 1];
  if (!partial) return;
  partial.hidden = false;
  if (fitPartial(partial, slot)) return;
  // Sem espaço para o texto: tenta de novo sem a foto da matéria.
  const fig = partial.querySelector<HTMLElement>(".np-story-fig");
  if (fig) {
    fig.hidden = true;
    restore(partial);
    if (fitPartial(partial, slot)) return;
  }
  partial.hidden = true;
}

export function fitPage(page: HTMLElement) {
  for (const flow of page.querySelectorAll<HTMLElement>("[data-flow]")) flowSlot(flow);
  for (const slot of page.querySelectorAll<HTMLElement>("[data-slot]")) fitSlot(slot);
}

/** Refaz o encaixe quando o conteúdo muda, a página muda de tamanho (zoom) ou as fontes terminam de carregar. */
export function useFitPage(ref: RefObject<HTMLElement | null>, deps: unknown[]) {
  useLayoutEffect(() => {
    const page = ref.current;
    if (!page) return;
    let width = -1;
    const run = () => {
      // Folha escondida (display: none) não tem medidas: não dá para encaixar.
      if (!page.offsetWidth) return;
      width = page.offsetWidth;
      fitPage(page);
    };
    run();
    const ro = new ResizeObserver(() => {
      if (page.offsetWidth !== width) run();
    });
    ro.observe(page);
    let alive = true;
    document.fonts?.ready.then(() => alive && run());
    return () => {
      alive = false;
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
