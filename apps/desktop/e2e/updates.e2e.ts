import { expect, test } from "@playwright/test";
import { onboard } from "./helpers";

test("preferências: procurar atualizações mostra a versão atual", async ({ page }) => {
  await onboard(page);
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: /^Preferências/ }).click();
  const section = page.getByRole("region", { name: "Atualizações" });
  await expect(section.getByRole("checkbox", { name: /Instalar atualizações automaticamente/ })).toBeChecked();
  await section.getByRole("button", { name: "Procurar atualizações" }).click();
  await expect(section.getByText("Você está na versão mais recente.")).toBeVisible();
});
