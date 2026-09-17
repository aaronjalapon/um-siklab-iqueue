import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

function localDate(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

async function expectNoSeriousAxeViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    violation.impact === "serious" || violation.impact === "critical"
  );
  expect(serious, serious.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("iqueue:pwa-install-dismissed:v1", String(Date.now()));
  });
});

test("critical public and booking views have no serious axe violations", async ({ page }) => {
  for (const path of ["/", "/buy", "/operator"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoSeriousAxeViolations(page);
  }
});

test("landing ticket stays legible in dark mode without zoom-width overflow", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 690, height: 832 });
  await page.goto("/");

  const preview = page.getByLabel("TripSync booking preview");
  await expect(preview).toBeVisible();
  await expect(preview.getByText("Davao City → Cagayan de Oro")).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expectNoSeriousAxeViolations(page);
});

test.describe("Asia/Manila service date", () => {
  test.use({ timezoneId: "Asia/Manila" });

  test("defaults to the local calendar day and blocks a past date", async ({ page }) => {
    const now = new Date("2026-09-17T00:01:00+08:00");
    await page.clock.setFixedTime(now);
    await page.goto("/buy");

    const date = page.getByLabel("Travel date");
    await expect(date).toHaveValue("2026-09-17");
    await expect(date).toHaveAttribute("min", "2026-09-17");
    await date.fill("2026-09-16");
    await expect(page.getByText("Choose today or a future date.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Search Tickets" })).toBeDisabled();
  });
});

test("mobile booking content clears fixed navigation and keeps help inline", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/buy");
  await expect(page.getByRole("button", { name: "Need help?" })).toBeVisible();
  await expect(page.getByLabel("Chat with TripSync Assistant")).toHaveCount(0);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const mainPadding = await page.locator("main").evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).paddingBottom)
  );
  expect(mainPadding).toBeGreaterThanOrEqual(96);
});

test("booking controls expose stable accessible names and focus", async ({ page }) => {
  await page.goto("/buy");
  for (const name of ["Origin", "Destination", "Travel date"]) {
    await expect(page.getByLabel(name)).toBeVisible();
  }
  await page.getByLabel("Origin").focus();
  await expect(page.getByLabel("Origin")).toBeFocused();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await page.getByLabel("Travel date").fill(localDate(tomorrow));
});
