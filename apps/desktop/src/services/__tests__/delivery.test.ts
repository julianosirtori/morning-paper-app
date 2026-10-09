import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/native", () => ({}));
vi.mock("../../i18n", () => ({ t: (k: string) => k }));
vi.mock("../../store/editions", () => ({}));
vi.mock("../../store/navigation", () => ({}));
vi.mock("../../store/preferences", () => ({}));
vi.mock("../../store/print", () => ({}));
vi.mock("../../store/reader", () => ({}));
vi.mock("../../store/system", () => ({}));
vi.mock("../../store/toasts", () => ({}));

import { waitForPrintSheets } from "../delivery";

afterEach(() => vi.unstubAllGlobals());

describe("waitForPrintSheets", () => {
  it("não trava quando a tela está apagada e o requestAnimationFrame nunca dispara", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("document", { querySelectorAll: () => [] });
    const done = vi.fn();
    void waitForPrintSheets().then(done);
    await vi.waitFor(() => expect(done).toHaveBeenCalled(), { timeout: 1000 });
  });
});
