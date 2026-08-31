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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("iqueue:pwa-install-dismissed:v1", String(Date.now()));
  });
});

test("TripSync branding is consistent across public and operator surfaces", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Board smart, travel smarter." })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "TripSync home" }).first()).toBeVisible();
  await expect(page.getByLabel("Chat with TripSync Assistant")).toBeVisible();

  const logoResponse = await page.request.get("/tripsync-mark.png");
  expect(logoResponse.ok()).toBeTruthy();

  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("TripSync");

  await page.goto("/operator");
  await expect(
    page.getByRole("link", { name: "TripSync Ops — Operator Dashboard" })
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("camera scanner explains denied permission and preserves the manual fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices: async () => [],
        getUserMedia: async () => {
          throw new DOMException("Camera permission denied", "NotAllowedError");
        },
      },
    });
  });

  await page.goto("/operator/scanner");
  await expect(page.getByRole("heading", { name: "Camera QR scanner" })).toBeVisible();
  await expect(page.getByLabel("Live camera preview for QR boarding-pass scanning")).toBeVisible();
  await page.getByRole("button", { name: "Start camera" }).click();
  await expect(page.getByText(/Camera access was blocked/).first()).toBeVisible();
  await expect(page.getByLabel("QR token")).toBeEditable();
  await expect(page.getByRole("button", { name: "Verify Pass" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("passenger booking produces a signed, verifiable boarding pass", async ({
  page,
}, testInfo) => {
  await page.goto("/buy");
  await page.locator('input[type="date"]').fill(tomorrow());
  await page.getByRole("button", { name: "Davao -> CDO" }).click();
  await page.getByRole("button", { name: "Search Tickets" }).click();
  await expect(page.getByText("2 buses found")).toBeVisible();
  await page.getByRole("link", { name: "Continue to Preferences" }).first().click();

  await page.getByLabel("Full name").fill(`Judge Flow ${testInfo.project.name}`);
  await page.getByLabel("Phone number").fill(
    testInfo.project.name.startsWith("mobile")
      ? "+639181111112"
      : "+639181111111"
  );
  await page.getByText("Opt in to seatmate matching").click();
  await page.getByLabel("Shared seat preference").selectOption("window");
  await page.getByRole("button", { name: "Find My Best Seat" }).click();

  await expect(page.getByText("TripSync Recommended")).toBeVisible();
  await page.getByRole("button", { name: "Confirm Booking" }).click();
  await expect(page.getByRole("heading", { name: "Booking Confirmed" })).toBeVisible();
  await expect(page.getByText("TripSync Boarding Pass")).toBeVisible();

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

test("accessible family receives adjacent seats, one pass, and online group verification", async ({
  page,
}) => {
  await page.goto("/buy");
  await page.locator('input[type="date"]').fill(tomorrow());
  await page.getByRole("button", { name: "Davao -> CDO" }).click();
  await page.getByRole("button", { name: "Search Tickets" }).click();
  await page.getByRole("link", { name: "Continue to Preferences" }).first().click();

  await page.getByRole("button", { name: "Family booking" }).click();
  await page.getByRole("button", { name: "Load BIDA demo family" }).click();
  await expect(page.getByText("1 passenger currently requires priority seating.")).toBeVisible();
  await expect(page.getByText("Optional affinity matching")).toBeVisible();
  await page.getByRole("button", { name: "Recommend Family Seats" }).click();

  await expect(page.getByRole("heading", { name: "Review Your Family Seats" })).toBeVisible();
  await expect(page.getByText("Maria Santos")).toBeVisible();
  await expect(page.getByText("Companion seated beside accessibility passenger")).toBeVisible();
  await expect(page.getByText("Nearest available standard seat")).toBeVisible();
  await page.getByRole("button", { name: "Confirm Family Booking" }).click();

  await expect(page.getByRole("heading", { name: "Family Booking Confirmed" })).toBeVisible();
  await expect(page.getByText("TripSync Combined Family Pass")).toBeVisible();
  await expect(page.getByText("One QR for the whole family")).toBeVisible();
  const token = await page.evaluate(() => {
    const raw = localStorage.getItem("iqueue:group-boarding-passes:v1");
    const passes = raw ? JSON.parse(raw) : [];
    return passes[0]?.qr_token as string | undefined;
  });
  expect(token).toBeTruthy();

  await page.goto("/operator/scanner");
  await page.getByLabel("QR token").fill(token!);
  await page.getByRole("button", { name: "Verify Pass" }).click();
  await expect(page.getByText("group", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Group member statuses" })).toBeVisible();
  await expect(page.getByText(/^Seat \d+[A-D]$/).first()).toBeVisible();
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
