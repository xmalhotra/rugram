import { expect, test } from "@playwright/test";

test("a member can schedule a sourced component", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Account").fill("john");
  await page.getByLabel("Password").fill("12345");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Your day, in rhythm." })).toBeVisible();

  await page.getByRole("button", { name: "Choose a routine category" }).click();
  await page.getByRole("button", { name: /Drink/ }).click();
  await page.getByRole("button", { name: "Choose time" }).first().click();
  await page.getByRole("button", { name: "Add to timeline" }).click();
  await expect(page.getByText("Water on waking")).toBeVisible();
});
