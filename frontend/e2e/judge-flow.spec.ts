import { expect, test } from "@playwright/test";

function tomorrow(): string {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  await expect(page.getByRole("heading", { name: "Operator Dashboard" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Boarding Pass Verification" })).toBeVisible();
  await expect(page.getByText("Gate QR Scanner")).toBeVisible();
  await page.getByRole("button", { name: "Live Video" }).click();
  await expect(page.getByText(/Camera permission was blocked/).first()).toBeVisible();
  await expect(page.getByLabel("Raw Signed Boarding Token")).toBeEditable();
  await expect(page.getByRole("button", { name: "Verify Token" })).toBeVisible();
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
  const uniqueMobile = `+639${String(Date.now()).slice(-9)}`;
  await page.getByLabel("Mobile number").fill(uniqueMobile);
  await page.getByText("Seatmate affinity matching").click();
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
  await page.getByLabel("Raw Signed Boarding Token").fill(token!);
  await page.getByRole("button", { name: "Verify Token" }).click();
  await expect(page.getByText("HMAC Valid ✓")).toBeVisible();
  await expect(page.getByText("not_yet_valid", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("accessible family receives adjacent seats, one pass, and online group verification", async ({
  page,
}, testInfo) => {
  await page.goto("/buy");
  await page.locator('input[type="date"]').fill(tomorrow());
  await page.getByRole("button", { name: "Davao -> CDO" }).click();
  await page.getByRole("button", { name: "Search Tickets" }).click();
  const busResultLinks = page.getByRole("link", { name: "Continue to Preferences" });
  if (testInfo.project.name.startsWith("mobile")) {
    await busResultLinks.last().click();
  } else {
    await busResultLinks.first().click();
  }

  await page.getByRole("button", { name: "Group Booking" }).click();
  await page.getByRole("button", { name: "Load demo group" }).click();
  await page.getByRole("button", { name: "Recommend Group Seats" }).click();

  await expect(page.getByRole("heading", { name: "Review Your Group Seats" })).toBeVisible();
  await expect(page.getByText("Maria Santos")).toBeVisible();
  await page.getByRole("button", { name: "Confirm Group Booking" }).click();

  await expect(page.getByRole("heading", { name: "Group Booking Confirmed" })).toBeVisible();
  await expect(page.getByText("TripSync Combined Group Pass")).toBeVisible();
  await expect(page.getByText("One QR for the whole group")).toBeVisible();
  const token = await page.evaluate(() => {
    const raw = localStorage.getItem("iqueue:group-boarding-passes:v1");
    const passes = raw ? JSON.parse(raw) : [];
    return passes[0]?.qr_token as string | undefined;
  });
  expect(token).toBeTruthy();

  await page.goto("/operator/scanner");
  await page.getByLabel("Raw Signed Boarding Token").fill(token!);
  await page.getByRole("button", { name: "Verify Token" }).click();
  await expect(page.getByText("group", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Group Member Manifest/ })).toBeVisible();
  await expect(page.getByText(/^Seat \d+[A-D]$/).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("operator closes and replays the auditable learning loop", async ({ page }) => {
  await page.goto("/operator");
  await expect(page.getByText(/Source: (ml_bundle|heuristic)/)).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText("Feedback logged for future model retraining.")).toBeVisible();

  await page.getByRole("button", { name: "Record Outcome" }).click();
  await page.getByLabel("Actual passenger count *").fill("440");
  await page.getByLabel("Peak queue length").fill("24");
  await page.getByLabel("P95 wait time (min)").fill("8.5");
  await page.getByRole("button", { name: "Save Outcome" }).click();

  await page.getByRole("button", { name: "Replay Learning Cycle" }).click();
  await expect(page.getByText(/Decision: (promote|retain champion)/i)).toBeVisible();
  await page.goto("/operator/evidence");
  await expect(page.getByText("Synthetic-data prototype")).toBeVisible();
  await expect(page.getByRole("table", { name: "Untouched-test model comparison" })).toBeVisible();
  await expect(page.getByText(/rerun final pipeline for untouched-test metrics/i)).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
