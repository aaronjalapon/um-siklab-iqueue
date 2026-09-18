import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("iqueue:pwa-install-dismissed:v1", String(Date.now()));
  });
});

test("network starts with the pilot and keeps map and directory selection synchronized", async ({ page }) => {
  await page.goto("/");
  const pilotMode = page.getByRole("button", { name: "Mindanao Pilot (7)" });
  await expect(pilotMode).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("network-map")).toBeVisible();
  await expect(page.getByRole("button", { name: "Select Davao City" })).toHaveAttribute("aria-pressed", "true");

  const marker = page.getByRole("button", { name: "Select Cagayan de Oro" });
  await marker.focus();
  await marker.press("Enter");
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { expanded: true }).filter({ hasText: "Cagayan de Oro" })).toBeVisible();

  const bookingLink = page.getByRole("link", { name: "Find routes" });
  await expect(bookingLink).toHaveAttribute("href", "/buy?origin=Cagayan%20de%20Oro");
});

test("ASEAN concept filters hubs and never presents concept locations as bookable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "ASEAN Concept (7)" }).click();

  await expect(page.getByRole("button", { name: "All hubs" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Cross-border ASEAN" }).click();
  await expect(page.getByText("4 hubs", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select Kuala Lumpur" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select Manila" })).toHaveCount(0);

  await page.getByRole("button", { name: "Select Kuala Lumpur" }).click();
  await expect(page.getByText("Illustrative concept", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Find routes" })).toHaveCount(0);

  await page.getByRole("button", { name: "Philippine corridors" }).click();
  await expect(page.getByText("3 hubs", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select Davao" })).toHaveAttribute("aria-pressed", "true");
});

test("install action dispatches the existing PWA request event", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    (window as Window & { installRequestObserved?: boolean }).installRequestObserved = false;
    window.addEventListener("iqueue:request-pwa-install", () => {
      (window as Window & { installRequestObserved?: boolean }).installRequestObserved = true;
    }, { once: true });
  });
  await page.getByTestId("hero-install-app").click();
  await expect.poll(() => page.evaluate(() => (window as Window & { installRequestObserved?: boolean }).installRequestObserved)).toBe(true);
});

test("terminal directory remains usable when the map asset fails", async ({ page }) => {
  await page.route("**/maps/countries-50m.json", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/");
  await expect(page.getByText("Map unavailable", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Cagayan de Oro/ }).last().click();
  await expect(page.getByRole("button", { expanded: true }).filter({ hasText: "Cagayan de Oro" })).toBeVisible();
});

test("landing remains free of horizontal overflow at supported widths", async ({ page }) => {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});
