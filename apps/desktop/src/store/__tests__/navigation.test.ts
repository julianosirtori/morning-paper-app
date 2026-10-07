import { beforeEach, describe, expect, it, vi } from "vitest";

// O store lê location.hash ao ser criado e usa history.pushState: simulamos os dois no ambiente node.
const nav = vi.hoisted(() => {
  const loc = { hash: "#fontes" };
  const pushState = (_data: unknown, _unused: string, url: string) => {
    loc.hash = url;
  };
  const history = { pushState };
  Object.assign(globalThis, { location: loc, history });
  return { loc, history };
});

import { isViewId, syncViewFromHash, useNavigation } from "../navigation";

const state = () => useNavigation.getState();

beforeEach(() => {
  nav.loc.hash = "";
  useNavigation.setState({ view: "hoje", focusRequest: { n: 0 } });
  vi.restoreAllMocks();
});

describe("navegação", () => {
  it("começa na tela indicada no endereço", () => {
    // O store foi criado com location.hash = "#fontes".
    expect(useNavigation.getInitialState().view).toBe("fontes");
  });

  it("isViewId só aceita as telas conhecidas", () => {
    expect(isViewId("edicao")).toBe(true);
    expect(isViewId("configuracoes")).toBe(false);
    expect(isViewId("")).toBe(false);
  });

  it("go troca a tela, grava no histórico e pede o foco", () => {
    const push = vi.spyOn(nav.history, "pushState");
    state().go("preferencias", { focus: "impressora" });
    expect(push).toHaveBeenCalledWith({ v: "preferencias" }, "", "#preferencias");
    expect(state().view).toBe("preferencias");
    expect(state().focusRequest).toEqual({ id: "impressora", n: 1 });
  });

  it("go não repete a entrada no histórico quando já está na tela, mas renova o pedido de foco", () => {
    nav.loc.hash = "#edicao";
    const push = vi.spyOn(nav.history, "pushState");
    state().go("edicao");
    state().go("edicao");
    expect(push).not.toHaveBeenCalled();
    expect(state().focusRequest.n).toBe(2);
  });

  it("go com push: false não mexe no histórico", () => {
    const push = vi.spyOn(nav.history, "pushState");
    state().go("revisar", { push: false });
    expect(push).not.toHaveBeenCalled();
    expect(state().view).toBe("revisar");
  });

  it("syncViewFromHash segue o endereço e volta para Hoje se ele for desconhecido", () => {
    nav.loc.hash = "#imprimir";
    syncViewFromHash();
    expect(state().view).toBe("imprimir");
    nav.loc.hash = "#xyz";
    syncViewFromHash();
    expect(state().view).toBe("hoje");
  });
});
