import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "i18next";

vi.mock("../../lib/native", () => ({ printEdition: vi.fn(async () => {}) }));
vi.mock("../editions", () => ({
  useEditions: { getState: () => ({ editions: [{ n: 8, pageCount: 6 }, { n: 7, pageCount: 4 }] }) },
}));

import { PDF_PRINTER } from "../../data/system";
import type { Printer } from "../../data/types";
import { resources } from "../../i18n";
import { printEdition } from "../../lib/native";
import { MAX_COPIES, usePrint } from "../print";
import { useReader } from "../reader";
import { useToasts } from "../toasts";

const office: Printer = { id: "Office", name: "Office Printer", status: "ready" };
const state = () => usePrint.getState();
/** Roda a impressão pulando a pausa de 500 ms. */
const run = async (printer: Printer) => {
  const p = state().print(printer);
  await vi.advanceTimersByTimeAsync(500);
  await p;
};

beforeAll(async () => {
  await i18n.init({ resources, lng: "pt-BR", fallbackLng: "en", interpolation: { escapeValue: false } });
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(printEdition).mockReset().mockResolvedValue(undefined);
  usePrint.setState({ copies: 1, range: "all", printing: false, message: null });
  useReader.setState({ viewing: null });
  useToasts.setState({ toasts: [] });
});
afterEach(() => vi.useRealTimers());

describe("cópias e páginas", () => {
  it("cópias ficam entre 1 e MAX_COPIES", () => {
    state().setCopies(3);
    expect(state().copies).toBe(3);
    state().setCopies(MAX_COPIES + 10);
    expect(state().copies).toBe(MAX_COPIES);
    state().setCopies(0);
    expect(state().copies).toBe(1);
    state().setCopies(-4);
    expect(state().copies).toBe(1);
  });

  it("setRange escolhe todas as páginas ou só a capa", () => {
    state().setRange("front");
    expect(state().range).toBe("front");
  });
});

describe("imprimir", () => {
  it("impressora desligada: não imprime e oferece escolher outra", async () => {
    await run({ ...office, status: "offline" });
    expect(printEdition).not.toHaveBeenCalled();
    expect(state().message).toMatchObject({ tone: "err", offline: true });
    expect(state().message!.text).toContain("Office Printer");
    expect(state().printing).toBe(false);
    expect(useToasts.getState().toasts.at(-1)?.tone).toBe("err");
  });

  it("envia para a impressora com cópias e páginas da edição mais recente", async () => {
    state().setCopies(2);
    await run(office);
    expect(printEdition).toHaveBeenCalledWith(office);
    expect(state().message).toEqual({ tone: "ok", text: "Enviado para Office Printer: 2 cópias, 6 páginas." });
  });

  it("usa a edição em leitura e respeita 'só a capa'", async () => {
    useReader.setState({ viewing: 7 });
    state().setRange("front");
    await run(office);
    expect(state().message!.text).toBe("Enviado para Office Printer: 1 cópia, só a primeira página.");
  });

  it("PDF abre o diálogo do sistema sem impressora", async () => {
    await run(PDF_PRINTER);
    expect(printEdition).toHaveBeenCalledWith(undefined);
    expect(state().message).toMatchObject({ tone: "ok" });
    expect(state().message!.text).toContain("morning-paper-8.pdf");
  });

  it("falha na impressão vira mensagem de erro e libera o botão", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(printEdition).mockRejectedValue(new Error("cups"));
    await run(office);
    expect(state().message).toMatchObject({ tone: "err" });
    expect(state().printing).toBe(false);
  });

  it("ignora um segundo pedido enquanto imprime", async () => {
    const first = state().print(office);
    const second = state().print(office);
    await vi.advanceTimersByTimeAsync(500);
    await Promise.all([first, second]);
    expect(printEdition).toHaveBeenCalledTimes(1);
  });
});
