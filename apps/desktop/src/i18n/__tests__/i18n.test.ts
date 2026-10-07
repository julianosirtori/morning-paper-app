import { describe, expect, it } from "vitest";
import { resolveLanguage, resources } from "..";

type Tree = { [k: string]: string | Tree };
const keys = (o: Tree, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [p + k] : keys(v, p + k + ".")));

describe("resolveLanguage", () => {
  it("usa português para qualquer variante pt", () => {
    expect(resolveLanguage("pt-BR")).toBe("pt-BR");
    expect(resolveLanguage("pt-PT")).toBe("pt-BR");
    expect(resolveLanguage("pt")).toBe("pt-BR");
  });
  it("usa inglês para os demais idiomas", () => {
    expect(resolveLanguage("en-US")).toBe("en");
    expect(resolveLanguage("es-ES")).toBe("en");
    expect(resolveLanguage(undefined)).toBe("en");
  });
});

describe("traduções", () => {
  it("pt-BR e en têm as mesmas chaves", () => {
    expect(keys(resources.en.translation as Tree).sort()).toEqual(keys(resources["pt-BR"].translation as Tree).sort());
  });
});
