import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast, useToasts } from "../toasts";

beforeEach(() => {
  vi.useFakeTimers();
  useToasts.setState({ toasts: [] });
});
afterEach(() => vi.useRealTimers());

describe("avisos", () => {
  it("mostra o aviso com ids diferentes e o tom de erro", () => {
    toast("Salvo");
    toast("Falhou", "err");
    const [a, b] = useToasts.getState().toasts;
    expect(a).toMatchObject({ msg: "Salvo", tone: undefined });
    expect(b).toMatchObject({ msg: "Falhou", tone: "err" });
    expect(a.id).not.toBe(b.id);
  });

  it("marca como saindo depois de 3,6 s e remove logo em seguida", () => {
    toast("Oi");
    vi.advanceTimersByTime(3599);
    expect(useToasts.getState().toasts[0].leaving).toBeUndefined();
    vi.advanceTimersByTime(1);
    expect(useToasts.getState().toasts[0].leaving).toBe(true);
    vi.advanceTimersByTime(160);
    expect(useToasts.getState().toasts).toEqual([]);
  });

  it("cada aviso some no seu tempo, sem levar os outros", () => {
    toast("Primeiro");
    vi.advanceTimersByTime(2000);
    toast("Segundo");
    vi.advanceTimersByTime(1760);
    expect(useToasts.getState().toasts.map((t) => t.msg)).toEqual(["Segundo"]);
  });
});
