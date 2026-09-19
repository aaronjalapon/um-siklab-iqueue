import { test, expect } from "@playwright/test";

test.describe("Chatbot Responsive & Interactive Launcher", () => {
  test("landing page desktop: opens floating assistant on click and closes cleanly", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const launcher = page.getByLabel("Chat with TripSync Assistant");
    await expect(launcher).toBeVisible();

    await launcher.click();

    const panel = page.locator("#iqueue-chatbot-panel");
    await expect(panel).toBeVisible();

    // On desktop, it should be a floating card, not full screen
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    if (panelBox) {
      expect(panelBox.width).toBeLessThan(500);
      expect(panelBox.width).toBeGreaterThan(300);
    }

    // Close button works
    const closeBtn = panel.getByRole("button", { name: "Close assistant" });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(panel).not.toBeVisible();
  });

  test("landing page tablet: opens assistant on click/tap", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    const launcher = page.getByLabel("Chat with TripSync Assistant");
    await expect(launcher).toBeVisible();

    await launcher.click();

    const panel = page.locator("#iqueue-chatbot-panel");
    await expect(panel).toBeVisible();

    const closeBtn = panel.getByRole("button", { name: "Close assistant" });
    await closeBtn.click();
    await expect(panel).not.toBeVisible();
  });

  test("landing page mobile: opens full-screen assistant, locks background scroll, and closes cleanly", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const launcher = page.getByLabel("Chat with TripSync Assistant");
    await expect(launcher).toBeVisible();

    // Tap/click launcher
    await launcher.click();

    const panel = page.locator("#iqueue-chatbot-panel");
    await expect(panel).toBeVisible();

    // Check full-screen dimensions on mobile
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    if (panelBox) {
      expect(Math.abs(panelBox.width - 390)).toBeLessThanOrEqual(2);
      expect(Math.abs(panelBox.height - 844)).toBeLessThanOrEqual(2);
    }

    // Check that background body scroll is locked
    const bodyOverflow = await page.evaluate(() => ({
      overflow: document.body.style.overflow,
      docOverflow: document.documentElement.style.overflow,
      touchAction: document.body.style.touchAction,
    }));
    expect(bodyOverflow.overflow).toBe("hidden");
    expect(bodyOverflow.docOverflow).toBe("hidden");
    expect(bodyOverflow.touchAction).toBe("none");

    // Close assistant using close button
    const closeBtn = panel.getByRole("button", { name: "Close assistant" });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    await expect(panel).not.toBeVisible();

    // Verify background body scroll is restored
    const restoredOverflow = await page.evaluate(() => ({
      overflow: document.body.style.overflow,
      docOverflow: document.documentElement.style.overflow,
      touchAction: document.body.style.touchAction,
    }));
    expect(restoredOverflow.overflow).toBe("");
    expect(restoredOverflow.docOverflow).toBe("");
    expect(restoredOverflow.touchAction).toBe("");

    // Launcher is visible again on mobile
    await expect(launcher).toBeVisible();
  });

  test("passenger booking page /buy: retains floating draggable chatbot icon and opens full-screen on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/buy");

    // Fixed top "Need help?" banner should NOT exist
    await expect(page.getByRole("button", { name: "Need help?" })).toHaveCount(0);

    // Floating chatbot icon MUST be retained and visible
    const launcher = page.getByLabel("Chat with TripSync Assistant");
    await expect(launcher).toBeVisible();

    await launcher.click();

    const panel = page.locator("#iqueue-chatbot-panel");
    await expect(panel).toBeVisible();

    // Mobile full screen
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    if (panelBox) {
      expect(Math.abs(panelBox.width - 390)).toBeLessThanOrEqual(2);
    }

    // Background locked
    const isLocked = await page.evaluate(() => document.body.style.overflow === "hidden");
    expect(isLocked).toBe(true);

    // Close using Escape key
    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible();

    const isUnlocked = await page.evaluate(() => document.body.style.overflow === "");
    expect(isUnlocked).toBe(true);
  });
});
