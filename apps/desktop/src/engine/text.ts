// Utilitários de texto: HTML de feed → texto puro, frases e cortes que não quebram palavras.

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Converte o HTML de um item de feed em parágrafos de texto puro (sem scripts, legendas de imagem, "leia mais"…). */
export function htmlToParagraphs(html: string): string[] {
  const cleaned = html
    .replace(/<(script|style|figure|figcaption|iframe|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(cleaned)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 1)
    .filter((p) => !/^(leia mais|continue lendo|read more|continue reading|the post .* appeared first on)/i.test(p))
    .map((p) => p.replace(/\s*(\[…\]|\[\.\.\.\]|…|\.\.\.)\s*$/, "…").replace(/ The post .* appeared first on .*$/i, ""));
}

export const htmlToText = (html: string) => htmlToParagraphs(html).join(" ");

/** Primeira imagem (<img src>) do HTML, se houver. */
export function firstImage(html: string): string | undefined {
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m && /^https?:/i.test(m[1]) ? m[1] : undefined;
}

/** Divide em frases (simples, suficiente para notícias). */
export function sentences(text: string): string[] {
  // Só termina a frase quando a pontuação vem antes de um espaço ou do fim ("6.000 mAh" e "R$ 1,32" seguem juntos).
  return text.match(/\S.*?(?:[.!?…]+["”’)]?(?=\s|$)|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}

/** Corta no fim de uma frase até `max` caracteres; se nenhuma frase cabe, corta na palavra com "…". */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  let out = "";
  for (const s of sentences(text)) {
    if ((out + " " + s).trim().length > max) break;
    out = (out + " " + s).trim();
  }
  if (out.length >= max * 0.5) return out;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : cut.length).replace(/[,;:\s]+$/, "") + "…";
}

/**
 * Tira a legenda e o crédito da foto que alguns feeds (g1) colam no começo do texto:
 * "PM apreendeu uma pistola Polícia Militar/Divulgação Um homem de 30 anos…" → "Um homem de 30 anos…".
 */
export function stripPhotoCredit(p: string): string {
  const m = /^.{0,220}?\S+\/(?:Divulgação|Reprodução|Arquivo pessoal|Arquivo|Agência \S+|Getty Images|Reuters|AFP)\s+(?=[A-ZÀ-Ú])/.exec(p);
  return m ? p.slice(m[0].length) : p;
}

/** Remove acentos, caixa e pontuação: base para comparar títulos. */
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
