// Colunas de jornal feitas à mão. O WebKit ignora `columns` do CSS na impressão (o PDF sai com uma
// coluna só), então aqui o texto é distribuído em caixas lado a lado (grid, que imprime certo).
//
// Cada área [data-flow] tem o conteúdo do React escondido em .np-src e caixas vazias em .np-cols.
// Copiamos cada matéria para a coluna atual; se não cabe, ela é dividida na palavra e continua na
// próxima coluna (como no papel). O que sobra depois da última coluna sai, e a última matéria termina
// sempre no fim de uma frase. Com data-flow="items", nada é dividido: cada item vai inteiro.
import { sentences } from "../engine/text";

const over = (col: HTMLElement) => col.scrollHeight > col.clientHeight + 1;

/** Imagem que não carregou na cópia: fica a retícula cinza no lugar (a cópia não tem o onError do React). */
function prepare(node: HTMLElement): HTMLElement {
  for (const img of node.querySelectorAll("img")) {
    img.addEventListener("error", () => {
      img.closest(".np-img")?.classList.remove("np-img--photo");
      img.remove();
    }, { once: true });
  }
  return node;
}

const words = (el: HTMLElement) => (el.textContent ?? "").split(/\s+/).filter(Boolean);

/**
 * Deixa em `p` o maior número de palavras que cabe na coluna e devolve o resto (ou null se coube tudo).
 * Devolve undefined se nem uma palavra cabe.
 */
function splitParagraph(p: HTMLElement, col: HTMLElement): string | null | undefined {
  const all = words(p);
  let lo = 0;
  let hi = all.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    p.textContent = all.slice(0, mid).join(" ");
    if (over(col)) hi = mid - 1;
    else lo = mid;
  }
  p.textContent = all.slice(0, lo).join(" ");
  if (lo === 0) return undefined;
  if (lo === all.length) return null;
  p.classList.add("np-split");
  return all.slice(lo).join(" ");
}

function continuation(text: string): HTMLElement {
  const p = document.createElement("p");
  p.className = "np-cont";
  p.textContent = text;
  return p;
}

/**
 * A peça não coube inteira em `col`: deixa nela o que cabe e devolve o resto para a próxima coluna.
 * Devolve a peça inteira (fora da coluna) quando nem o começo cabe, e null quando não sobra nada.
 */
function split(piece: HTMLElement, col: HTMLElement, items: boolean): HTMLElement | null {
  const pristine = piece.cloneNode(true) as HTMLElement;
  const moveWhole = () => {
    piece.remove();
    return prepare(pristine);
  };
  if (items || piece.querySelector(".np-list")) return moveWhole();

  // Parágrafo solto (texto da matéria principal).
  if (piece.tagName === "P") {
    const rest = splitParagraph(piece, col);
    if (rest === undefined) return moveWhole();
    return rest === null ? null : continuation(rest);
  }

  // Matéria: título, foto e parágrafos. O que não cabe continua numa caixa sem título na próxima coluna.
  const paragraphs = [...piece.querySelectorAll<HTMLElement>(":scope > p")];
  const cont = document.createElement("section");
  cont.className = "np-story np-cont";
  for (let i = paragraphs.length - 1; i >= 0 && over(col); i--) cont.prepend(paragraphs[i]);
  if (over(col)) return moveWhole(); // nem o título com a foto cabe aqui
  // Traz de volta parte do primeiro parágrafo que saiu.
  const first = cont.querySelector<HTMLElement>(":scope > p");
  if (first) {
    piece.append(first);
    const rest = splitParagraph(first, col);
    if (rest === undefined) cont.prepend(first);
    else if (rest !== null) cont.prepend(continuation(rest));
  }
  // Título sem nenhuma linha de texto embaixo fica órfão: a matéria vai inteira para a próxima coluna.
  if (!piece.querySelector(":scope > p")) return moveWhole();
  return cont.childElementCount ? cont : null;
}

const SENTENCE_END = /[.!?…]["”’)]?$/;

/** A última matéria da área, se foi cortada, termina numa frase completa: corta o resto ou tira o pedaço. */
function endOnSentence(cols: HTMLElement[]) {
  for (let guard = 0; guard < 50; guard++) {
    const col = [...cols].reverse().find((c) => c.lastElementChild);
    const last = col?.lastElementChild as HTMLElement | null | undefined;
    if (!col || !last) return;
    if (last.querySelector(".np-list")) return;
    const paragraphs = last.tagName === "P" ? [last] : [...last.querySelectorAll<HTMLElement>(":scope > p")];
    const p = paragraphs[paragraphs.length - 1];
    if (!p) {
      last.remove(); // título sem texto
      continue;
    }
    const text = (p.textContent ?? "").trim();
    // Parágrafo inteiro (não foi cortado aqui) fica como veio, mesmo sem ponto final no feed.
    if (!p.classList.contains("np-split") || SENTENCE_END.test(text)) {
      p.classList.remove("np-split");
      return;
    }
    // Junta as frases inteiras do pedaço; a última, sem ponto, é a que ficou pela metade.
    const parts = sentences(text);
    const whole = parts.filter((s) => SENTENCE_END.test(s));
    if (whole.length) {
      p.textContent = whole.join(" ");
      p.classList.remove("np-split");
      return;
    }
    p.remove();
    if (last !== p && !last.querySelector(":scope > p")) last.remove();
  }
}

export function flowSlot(slot: HTMLElement) {
  slot.style.removeProperty("--cols");
  const n = Math.max(1, parseInt(getComputedStyle(slot).getPropertyValue("--cols"), 10) || 1);
  const first = fill(slot, n);
  if (first.used >= n || first.used === 0) return;
  // O texto acabou antes da última coluna: tira só as colunas vazias (as outras ficam mais largas),
  // desde que tudo continue cabendo; senão, volta para o número original.
  slot.style.setProperty("--cols", String(first.used));
  if (!fill(slot, first.used).complete) {
    slot.style.removeProperty("--cols");
    fill(slot, n);
  }
}

/** Distribui o conteúdo em `n` colunas: quantas ficaram com algo e se coube tudo. */
function fill(slot: HTMLElement, n: number): { used: number; complete: boolean } {
  const src = slot.querySelector<HTMLElement>(":scope > .np-src");
  const box = slot.querySelector<HTMLElement>(":scope > .np-cols");
  if (!src || !box) return { used: n, complete: true };
  const items = slot.dataset.flow === "items";
  const cols = Array.from({ length: n }, () => {
    const col = document.createElement("div");
    col.className = "np-col";
    return col;
  });
  box.replaceChildren(...cols);
  if (!box.clientHeight) return { used: n, complete: true };

  let c = 0;
  let placed = 0;
  let complete = true;
  for (const source of src.children) {
    let piece: HTMLElement | null = prepare(source.cloneNode(true) as HTMLElement);
    while (piece && c < n) {
      cols[c].append(piece);
      if (!over(cols[c])) break;
      const rest: HTMLElement | null = split(piece, cols[c], items);
      if (c === n - 1) {
        c = n; // o que não coube na última coluna sai
        complete = false;
        break;
      }
      c++;
      piece = rest;
    }
    if (c >= n) break;
    placed++;
  }
  if (placed < src.childElementCount) complete = false;
  if (!items) endOnSentence(cols);
  return { used: cols.filter((col) => col.childElementCount).length, complete };
}
