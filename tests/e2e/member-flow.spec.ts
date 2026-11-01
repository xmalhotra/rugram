import { expect, test } from "@playwright/test";

test("a member can add a preference without scheduling it", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Account").fill("john");
  await page.getByLabel("Password").fill("12345");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Your day, in rhythm." })).toBeVisible();

  await page.getByRole("button", { name: "Choose a routine category" }).click();
  await page.getByRole("button", { name: /Food/ }).click();

  const quinoaCard = page
    .locator(".component-card")
    .filter({ has: page.getByRole("heading", { name: "Quinoa breakfast base" }) });
  await quinoaCard.getByRole("button", { name: "Add to profile" }).click();

  await expect(page.getByRole("heading", { name: "John" })).toBeVisible();
  await expect(page.getByText("Food · Breakfast")).toBeVisible();
});

test("Ask BetterHabits recommends a library routine from a member goal", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Account").fill("john");
  await page.getByLabel("Password").fill("12345");
  await page.getByRole("button", { name: "Log in" }).click();

  await page.getByRole("button", { name: "✦ Ask BetterHabits" }).click();
  await page.getByRole("button", { name: "Build a running habit" }).click();
  await page.getByRole("button", { name: "Find my next routine" }).click();
  await expect(page.getByRole("heading", { name: "A smaller next step." })).toBeVisible();

  const runSuggestion = page.locator(".ask-results article").filter({ hasText: "Easy conversational run" });
  await runSuggestion.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Easy conversational run")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add time" })).toBeVisible();
});
