/** Lê os feeds de um arquivo OPML (exportado por leitores de RSS). */
export function parseOpml(xml: string): { name: string; url: string }[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) return [];
  return [...doc.querySelectorAll("outline[xmlUrl]")].map((o) => {
    const url = o.getAttribute("xmlUrl")!;
    return { name: o.getAttribute("title") || o.getAttribute("text") || url, url };
  });
}
