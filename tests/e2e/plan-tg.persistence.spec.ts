import { expect, test } from "@playwright/test";

test("PlantTG keeps edited rayon data after reload", async ({ page }) => {
  test.fixme(true, "Requires an authenticated manager session or dedicated Playwright test account.");

  const gbValue = "PLAYWRIGHT GB TEST";
  const tgValue = "PLAYWRIGHT TG TEST";
  const qtyValue = "9 BOX";

  await page.goto("/plan-tg");
  await expect(page.getByText("Plan TG / GB manager")).toBeVisible();

  await page.getByRole("button", { name: "Vue d'ensemble plan" }).click();
  await page.locator("button").filter({ hasText: /^Sucre$/ }).click();
  await page.locator("button").filter({ hasText: /^Tous rayons$/ }).click();
  await page.getByPlaceholder("Recherche rayon / produit / responsable...").fill("CHIPS");
  await page.getByRole("button", { name: /CHIPS/ }).first().click();

  await page.getByLabel("Produit GB (gondole basse)").fill(gbValue);
  await page.getByLabel("Produit TG").fill(tgValue);
  await page.getByLabel("Quantité").fill(qtyValue);
  await page.getByLabel("Mécanique").selectOption({ label: "2EME 50%" });

  await page.reload();
  await expect(page.getByText("Plan TG / GB manager")).toBeVisible();

  await page.getByPlaceholder("Recherche rayon / produit / responsable...").fill("CHIPS");
  await page.getByRole("button", { name: /CHIPS/ }).first().click();

  await expect(page.getByLabel("Produit GB (gondole basse)")).toHaveValue(gbValue);
  await expect(page.getByLabel("Produit TG")).toHaveValue(tgValue);
  await expect(page.getByLabel("Quantité")).toHaveValue(qtyValue);
  await expect(page.getByLabel("Mécanique")).toHaveValue("2EME 50%");

  await page.getByRole("button", { name: "Vider le rayon" }).click();
  await expect(page.getByLabel("Produit GB (gondole basse)")).toHaveValue("");
  await expect(page.getByLabel("Produit TG")).toHaveValue("");
});
