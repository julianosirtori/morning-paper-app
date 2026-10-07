import { beforeEach, describe, expect, it } from "vitest";
import { MAX_ZOOM, MIN_ZOOM, useReader } from "../reader";

const state = () => useReader.getState();

beforeEach(() => useReader.setState({ viewing: null, page: 0, zoom: 1 }));

describe("leitura", () => {
  it("setPage fica entre a primeira e a última página", () => {
    state().setPage(3, 6);
    expect(state().page).toBe(3);
    state().setPage(10, 6);
    expect(state().page).toBe(5);
    state().setPage(-2, 6);
    expect(state().page).toBe(0);
  });

  it("setZoom arredonda para um décimo e respeita os limites", () => {
    state().setZoom(1.23);
    expect(state().zoom).toBe(1.2);
    state().setZoom(5);
    expect(state().zoom).toBe(MAX_ZOOM);
    state().setZoom(0.1);
    expect(state().zoom).toBe(MIN_ZOOM);
  });

  it("open troca a edição e volta para a primeira página", () => {
    state().setPage(4, 6);
    state().open(12);
    expect(state()).toMatchObject({ viewing: 12, page: 0 });
    state().open(null);
    expect(state().viewing).toBeNull();
  });
});
