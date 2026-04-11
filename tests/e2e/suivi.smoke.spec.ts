import { expect, test } from "@playwright/test";

test("l acces a /suivi sans session redirige vers la connexion", async ({ page }) => {
  const runtimeErrors: string[] = [];

  page.on("pageerror", (error) => {
    runtimeErrors.push(error.message);
  });

  await page.goto("/suivi");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Connexion sécurisée au bureau manager")).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});
