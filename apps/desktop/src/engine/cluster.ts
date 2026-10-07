// Agrupa notícias repetidas: a mesma história contada por fontes diferentes vira uma só.
import { fold } from "./text";

const STOPWORDS = new Set(
  (
    "a o as os um uma uns umas de da do das dos em no na nos nas por para pra com sem sob sobre que e é ao aos à às se " +
    "seu sua seus suas mais menos como após ate até diz dizem foi são ser ter tem vai vão the a an of in on at to for from with " +
    "and or but is are was were be been by as after over into new says say said will it its this that how what why who"
  ).split(" "),
);

/** Palavras significativas do título (sem acento, sem palavras vazias). */
export function keywords(title: string): Set<string> {
  return new Set(
    fold(title)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

export function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / Math.min(a.size, b.size) * (inter >= 2 ? 1 : 0.5);
}

/** Agrupa itens cujos títulos compartilham a maior parte das palavras. Mantém a ordem de entrada. */
export function cluster<T extends { title: string }>(items: T[], threshold = 0.6): T[][] {
  const groups: { keys: Set<string>; items: T[] }[] = [];
  for (const item of items) {
    const k = keywords(item.title);
    const g = groups.find((x) => similarity(x.keys, k) >= threshold);
    // Compara só com o título que abriu o grupo, para o grupo não "puxar" assuntos vizinhos.
    if (g) {
      g.items.push(item);
    } else {
      groups.push({ keys: k, items: [item] });
    }
  }
  return groups.map((g) => g.items);
}
