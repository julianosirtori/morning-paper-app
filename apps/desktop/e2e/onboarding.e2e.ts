import { expect, test } from "@playwright/test";

test.describe("primeira abertura", () => {
  test("configura e gera a primeira edição", async ({ page }) => {
    await page.goto("/?lang=pt-BR");
    await expect(page.getByRole("heading", { name: "Seu jornal, impresso toda manhã." })).toBeVisible();
    await page.getByRole("button", { name: "Começar" }).click();

    // Fontes: pelo menos uma precisa estar marcada para continuar.
    await expect(page.getByRole("heading", { name: "De onde vêm as notícias?" })).toBeVisible();
    const suggestions = page.getByRole("group").getByRole("checkbox");
    if ((await suggestions.and(page.locator(":checked")).count()) === 0) await suggestions.first().check();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();

    // Edição, impressora, assistente e segundo plano: segue com o padrão.
    for (const title of ["Quando e quanto ler?", "Onde imprimir?", "Quem escreve os resumos?", "Deixe trabalhando sozinho."]) {
      await page.getByRole("button", { name: "Continuar" }).click();
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
    }
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("heading", { name: "Seu jornal está configurado." })).toBeVisible();
    await page.getByRole("button", { name: "Gerar minha primeira edição" }).click();

    await expect(page.getByRole("heading", { name: "Seu jornal está pronto." })).toBeVisible({ timeout: 30_000 });
    // A capa leva para a leitura da edição.
    await page.getByRole("link", { name: "Abrir a edição de hoje para ler" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Leia sua edição." })).toBeVisible();
  });

  test("não deixa continuar sem fontes", async ({ page }) => {
    await page.goto("/?lang=pt-BR");
    await page.getByRole("button", { name: "Começar" }).click();
    const checked = page.getByRole("group").getByRole("checkbox").and(page.locator(":checked"));
    while ((await checked.count()) > 0) await checked.first().uncheck();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await expect(page.getByText("Escolha pelo menos uma fonte.")).toBeVisible();
  });

  test("segue o idioma do sistema", async ({ page }) => {
    await page.goto("/?lang=en");
    await expect(page.locator("html")).toHaveAttribute("lang", /^en/);
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Seu jornal, impresso toda manhã.");
  });
});
