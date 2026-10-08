import { expect, test } from "@playwright/test";

// Sempre o release mais recente, pelo nome fixo que o release.yml publica.
const DMG = /github\.com\/.+\/releases\/latest\/download\/Morning\.Paper_aarch64\.dmg$/;

test.describe("botão de download conforme o computador", () => {
  test("Mac com chip Apple: abre o diálogo com o instalador do release", async ({ page }) => {
    await page.goto("./?platform=mac");
    const hero = page.locator(".hero");
    await hero.getByRole("link", { name: "Baixar para Mac" }).click();
    const dialog = page.getByRole("dialog", { name: "Instalar o Morning Paper" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Baixar o instalador" })).toHaveAttribute("href", DMG);
    await expect(dialog.getByText("Precisa de um Mac com chip Apple")).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("Mac sem chip identificado: avisa o requisito no diálogo", async ({ page }) => {
    await page.goto("./?platform=mac-unknown");
    await page.locator(".hero").getByRole("link", { name: "Baixar para Mac" }).click();
    await expect(page.getByRole("dialog").getByText("Precisa de um Mac com chip Apple")).toBeVisible();
  });

  for (const [platform, note] of [
    ["windows", "Você está usando Windows"],
    ["linux", "Você está usando Linux"],
    ["mac-intel", "Este Mac tem processador Intel"],
  ] as const) {
    test(`${platform}: leva para a página de downloads`, async ({ page }) => {
      await page.goto(`./?platform=${platform}`);
      const hero = page.locator(".hero");
      await expect(hero.getByText(note)).toBeVisible();
      await hero.getByRole("link", { name: "Ver downloads" }).click();
      await expect(page).toHaveURL(/\/downloads\//);
      await expect(page.getByRole("heading", { level: 1, name: "Baixar o Morning Paper" })).toBeVisible();
    });
  }
});

test.describe("página de downloads", () => {
  test("Windows: explica, oferece copiar o link e marca o sistema", async ({ page }) => {
    await page.goto("./downloads/?platform=windows");
    await expect(page.getByRole("heading", { name: "Windows: ainda não compatível." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copiar link" })).toBeVisible();
    await expect(page.locator('[data-plat="windows"]')).toContainText("Seu computador");
  });

  test("Mac com chip Apple: compatível, com o instalador do release", async ({ page }) => {
    await page.goto("./downloads/?platform=mac");
    await expect(page.getByRole("heading", { name: /compatível\.$/ })).toBeVisible();
    await expect(page.locator(".env-card").getByRole("link", { name: "Baixar para Mac" })).toHaveAttribute("href", DMG);
    await expect(page.locator('[data-plat="mac-arm"]')).toContainText("Seu computador");
  });

  test("sem JavaScript, os botões levam para a página de downloads", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("./");
    await expect(page.locator(".hero [data-download]")).toHaveAttribute("href", /\/downloads\/$/);
    await context.close();
  });
});
