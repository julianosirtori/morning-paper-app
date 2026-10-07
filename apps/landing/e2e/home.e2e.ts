import { expect, test } from "@playwright/test";

test("o seletor de estilos troca a capa de exemplo", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("radio", { name: /Financeiro/ }).check();
  await expect(page.locator("#style-page")).toHaveAttribute("data-style", "financial");
  await expect(page.locator("#style-cap")).toHaveText(/Estilo Financeiro/);
});

test("as perguntas frequentes abrem e fecham", async ({ page }) => {
  await page.goto("./#perguntas");
  const question = page.getByText("Preciso pagar por uma IA?");
  await question.click();
  await expect(page.getByText("O app não pede chave de API")).toBeVisible();
});

for (const path of ["./", "./downloads/"]) {
  test(`sem rolagem horizontal em ${path}`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("link do GitHub no cabeçalho", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("link", { name: "Código do Morning Paper no GitHub" })).toHaveAttribute("href", /^https:\/\/github\.com\//);
});
