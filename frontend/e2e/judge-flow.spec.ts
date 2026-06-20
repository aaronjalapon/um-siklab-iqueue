import { expect, test } from "@playwright/test";

function tomorrow(): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("passenger booking produces a signed, verifiable boarding pass", async ({
  page,
}, testInfo) => {
  await page.goto("/buy");
  await page.locator('input[type="date"]').fill(tomorrow());
  await page.getByRole("button", { name: "Davao -> CDO" }).click();
  await expect(page.getByText("2 buses found")).toBeVisible();
  await page.getByRole("link", { name: "Continue to Preferences" }).first().click();

  await page.getByLabel("Full name").fill(`Judge Flow ${testInfo.project.name}`);
  await page.getByLabel("Phone number").fill(
    testInfo.project.name.startsWith("mobile")
      ? "+639181111112"
      : "+639181111111"
  );
  await page.getByText("Opt in to seatmate matching").click();
  await page.getByRole("button", { name: "Window" }).click();
  await page.getByRole("button", { name: "Find My Best Seat" }).click();

  await expect(page.getByText("IQueue Recommended")).toBeVisible();
  await page.getByRole("button", { name: "Confirm Booking" }).click();
  await expect(page.getByRole("heading", { name: "Booking Confirmed" })).toBeVisible();
  await expect(page.getByText("IQueue Boarding Pass")).toBeVisible();

  const token = await page.evaluate(() => {
    const raw = localStorage.getItem("iqueue:boarding-passes:v1");
    const passes = raw ? JSON.parse(raw) : [];
    return passes[0]?.qr_token as string | undefined;
  });
  expect(token).toBeTruthy();

  await page.goto("/operator/scanner");
  await page.getByLabel("QR token").fill(token!);
  await page.getByRole("button", { name: "Verify Pass" }).click();
  await expect(page.getByText("Valid", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("operator closes and replays the auditable learning loop", async ({ page }) => {
  await page.goto("/operator");
  await expect(page.getByText("Source: ml_bundle")).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("Feedback logged for future model retraining.")).toBeVisible();

  await page.getByRole("button", { name: "Record Outcome" }).click();
  await page.getByLabel("Actual passengers").fill("440");
  await page.getByLabel("Peak queue length").fill("24");
  await page.getByLabel("P95 wait minutes").fill("8.5");
  await page.getByRole("button", { name: "Save Outcome" }).click();

  await page.getByRole("button", { name: "Replay Learning Cycle" }).click();
  await expect(page.getByText(/Decision: (promote|retain champion)/i)).toBeVisible();
  await page.goto("/operator/evidence");
  await expect(page.getByText("Synthetic-data prototype")).toBeVisible();
  await expect(page.getByText("Legacy validation comparison · canonical retrain required")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
