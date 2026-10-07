import { expect, type Page } from "@playwright/test";

/** Passa pelo onboarding com as fontes recomendadas e gera a primeira edição. */
export async function onboard(page: Page) {
  await page.goto("/?lang=pt-BR");
  await page.getByRole("button", { name: "Começar" }).click();
  for (let step = 0; step < 5; step++) await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Gerar minha primeira edição" }).click();
  await expect(page.getByRole("heading", { name: "Seu jornal está pronto." })).toBeVisible({ timeout: 30_000 });
}
