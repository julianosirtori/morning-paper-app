import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";

test.beforeEach(async ({ page }) => {
  await onboard(page);
});

test("o menu lateral leva a cada tela", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Principal" });
  const screens: [RegExp, string][] = [
    [/^Edição/, "Leia sua edição."],
    [/^Revisar/, "Revise antes de imprimir."],
    [/^Imprimir/, "Imprima seu jornal."],
    [/^Fontes/, "Suas fontes"],
    [/^Preferências/, "Preferências"],
    [/^Hoje/, "Seu jornal está pronto."],
  ];
  for (const [link, title] of screens) {
    await nav.getByRole("link", { name: link }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }
});

test("a paleta de comandos abre com ⌘K e navega", async ({ page }) => {
  await page.keyboard.press("Meta+k");
  const search = page.getByRole("combobox", { name: "Buscar comando" });
  await expect(search).toBeVisible();
  await search.fill("ver fontes");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Suas fontes" })).toBeVisible();
});

test("revisar: tirar uma notícia da edição e colocar de volta", async ({ page }) => {
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: /^Revisar/ }).click();
  // A manchete não pode sair (o botão dela fica desativado), então usa a primeira notícia que pode.
  const remove = page.getByRole("button", { name: "Tirar da edição" }).and(page.locator(":enabled")).first();
  await remove.click();
  await expect(page.getByText("Notícia tirada da edição.")).toBeVisible();
  await page.getByRole("button", { name: "Colocar de volta" }).first().click();
  await expect(page.getByText("Notícia de volta na edição.")).toBeVisible();
});
