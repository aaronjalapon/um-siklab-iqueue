import { expect, test } from "@playwright/test";

const THEME_KEY = "tripsync:theme:v1";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("tripsync:theme-test-initialized")) {
      localStorage.removeItem("tripsync:theme:v1");
      sessionStorage.setItem("tripsync:theme-test-initialized", "true");
    }
    localStorage.setItem("iqueue:pwa-install-dismissed:v1", String(Date.now()));
  });
});

test("follows the system theme until the user chooses an override", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const toggle = page.getByRole("button", { name: "Switch to light theme" }).first();
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "Switch to dark theme" }).first()).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe("light");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("theme control remains reachable in passenger, operator, and offline shells", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/home", "/operator", "/offline"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: /Switch to (light|dark) theme/ }).first()).toBeVisible();
  }
});

test("theme control keeps working when browser storage is unavailable", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate((themeKey) => {
    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === themeKey) throw new DOMException("Storage is unavailable", "SecurityError");
      return nativeSetItem.call(this, key, value);
    };
  }, THEME_KEY);

  await page.getByRole("button", { name: "Switch to dark theme" }).first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light theme" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Switch to light theme" }).first().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "Switch to dark theme" }).first()).toBeVisible();
});

test("reduced motion exposes final key-flow states immediately", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  const route = page.locator(".route-reveal").first();
  await expect(route).toBeVisible();
  await expect.poll(() => route.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});
