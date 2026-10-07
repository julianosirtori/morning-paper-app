import { beforeAll, describe, expect, it } from "vitest";
import i18n from "i18next";
import { resources } from "../../i18n";
import { clock, dayMonth, longDate, whenLabel } from "../dates";
import { normalize } from "../format";

// 2026-10-07 é uma quarta-feira.
const now = new Date(2026, 9, 7, 10, 30);

beforeAll(async () => {
  await i18n.init({ resources, lng: "pt-BR", fallbackLng: "en", interpolation: { escapeValue: false } });
});

describe("datas em português", () => {
  beforeAll(() => i18n.changeLanguage("pt-BR"));

  it("longDate com o dia da semana em maiúscula", () => {
    expect(longDate("2026-10-07")).toBe("Quarta-feira, 7 de outubro");
  });
  it("dayMonth sem o dia da semana", () => {
    expect(dayMonth("2026-01-31")).toBe("31 de janeiro");
  });
  it("clock no fuso local com dois dígitos", () => {
    expect(clock(new Date(2026, 9, 7, 5, 41).toISOString())).toBe("05:41");
  });
  it("whenLabel: hoje, amanhã ou a data", () => {
    expect(whenLabel("2026-10-07", now)).toBe("hoje");
    expect(whenLabel("2026-10-08", now)).toBe("amanhã");
    expect(whenLabel("2026-10-09", now)).toBe("sexta-feira, 9 de outubro");
  });
  it("whenLabel vira o mês e o ano", () => {
    expect(whenLabel("2027-01-01", new Date(2026, 11, 31, 22))).toBe("amanhã");
  });
});

describe("datas em inglês", () => {
  beforeAll(() => i18n.changeLanguage("en"));

  it("segue o idioma do app", () => {
    expect(longDate("2026-10-07")).toBe("Wednesday, October 7");
    expect(dayMonth("2026-10-07")).toBe("October 7");
    expect(whenLabel("2026-10-08", now)).toBe("tomorrow");
    expect(whenLabel("2026-10-09", now)).toBe("Friday, October 9");
  });
});

describe("normalize", () => {
  it("tira acentos e caixa para a busca", () => {
    expect(normalize("Preferências")).toBe("preferencias");
    expect(normalize("AÇÃO Ñ")).toBe("acao n");
    expect(normalize("plain")).toBe("plain");
  });
});
