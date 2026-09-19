import { expect, test } from "@playwright/test";

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPastDateString(): string {
  const past = new Date();
  past.setDate(past.getDate() - 3);
  const year = past.getFullYear();
  const month = String(past.getMonth() + 1).padStart(2, "0");
  const day = String(past.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getFutureDateString(daysAhead = 1): string {
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);
  const year = future.getFullYear();
  const month = String(future.getMonth() + 1).padStart(2, "0");
  const day = String(future.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test.describe("Quick Routes, Departure Times & Past-Date Protection", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("iqueue:pwa-install-dismissed:v1", String(Date.now()));
    });
  });

  test("displays all 6 designated quick routes", async ({ page }) => {
    await page.goto("/buy");

    const expectedRoutes = [
      "Pasay -> Baguio",
      "Cubao -> San Fernando City",
      "Panglao -> Tagbilaran",
      "Tagbilaran -> Jagna",
      "Davao -> Cagayan",
      "Davao -> General Santos",
    ];

    for (const label of expectedRoutes) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
  });

  test("Pasay -> Baguio quick route searches buses with ₱650 regular fare and rounded departure times", async ({
    page,
  }) => {
    await page.goto("/buy");
    await page.locator('input[type="date"]').fill(getFutureDateString(2));
    await page.getByRole("button", { name: "Pasay -> Baguio" }).click();

    await expect(page.getByText("2 buses found")).toBeVisible();
    await expect(page.getByText("PHP 650")).toBeVisible();

    // Verify departure time badge matches the 5-hour rounded rule: H:00 AM/PM
    const departureBadges = page.locator("text=/Departs \\d{1,2}:00 (AM|PM)/");
    await expect(departureBadges.first()).toBeVisible();
  });

  test("Panglao -> Tagbilaran quick route searches buses with ₱150 regular fare", async ({
    page,
  }) => {
    await page.goto("/buy");
    await page.locator('input[type="date"]').fill(getFutureDateString(2));
    await page.getByRole("button", { name: "Panglao -> Tagbilaran" }).click();

    await expect(page.getByText("2 buses found")).toBeVisible();
    await expect(page.getByText("PHP 150")).toBeVisible();
    await expect(page.locator("text=/Departs \\d{1,2}:00 (AM|PM)/").first()).toBeVisible();
  });

  test("Tagbilaran -> Jagna quick route searches buses with ₱180 regular fare", async ({
    page,
  }) => {
    await page.goto("/buy");
    await page.locator('input[type="date"]').fill(getFutureDateString(2));
    await page.getByRole("button", { name: "Tagbilaran -> Jagna" }).click();

    await expect(page.getByText("2 buses found")).toBeVisible();
    await expect(page.getByText("PHP 180")).toBeVisible();
    await expect(page.locator("text=/Departs \\d{1,2}:00 (AM|PM)/").first()).toBeVisible();
  });

  test("enforces past-date protection on /buy search", async ({ page }) => {
    await page.goto("/buy");

    const dateInput = page.locator('input[type="date"]');
    const today = getTodayString();
    const pastDate = getPastDateString();

    // Input must have min attribute set to today
    await expect(dateInput).toHaveAttribute("min", today);

    // If a user selects a past date
    await dateInput.fill(pastDate);
    await page.getByRole("button", { name: "Davao -> Cagayan" }).click();

    // Search button must be disabled
    const searchBtn = page.getByRole("button", { name: "Search Tickets" });
    await expect(searchBtn).toBeDisabled();

    // Past date warning must be displayed
    await expect(page.getByText("Cannot book past dates")).toBeVisible();
  });

  test("enforces past-date protection on preferences page", async ({ page }) => {
    // Attempting to visit preferences with a past date
    const pastDate = getPastDateString();
    await page.goto(`/book/test-bus-id/preferences?origin=Manila&destination=Baguio+City&travel_date=${pastDate}`);

    // Warning banner must be visible
    await expect(page.getByText("Cannot book past dates")).toBeVisible();

    // Submit button must be disabled
    const submitBtn = page.getByRole("button", { name: "Find My Best Seat" });
    await expect(submitBtn).toBeDisabled();
  });

  test("synchronizes ticket departure time and boarding window with tokenized data", async ({ page }) => {
    await page.goto("/buy");
    const travelDate = getFutureDateString(2);
    await page.locator('input[type="date"]').fill(travelDate);
    await page.getByRole("button", { name: "Pasay -> Baguio" }).click();

    await expect(page.getByText("2 buses found")).toBeVisible();

    // Locate the first bus card and read its displayed departure time
    const firstBusCard = page.locator("article, .clay-card").first();
    await expect(firstBusCard).toBeVisible();
    const departureBadge = firstBusCard.locator("text=/Departs (\\d{1,2}:00 (AM|PM))/");
    await expect(departureBadge).toBeVisible();
    const badgeText = await departureBadge.innerText();
    const departureTime = badgeText.replace("Departs ", "").trim();

    // Click continue to preferences
    await firstBusCard.getByRole("link", { name: "Continue to Preferences" }).click();

    // On preferences page
    await expect(page).toHaveURL(/.*\/book\/.*\/preferences/);
    await page.getByRole("button", { name: "Group Booking" }).click();
    await page.getByRole("button", { name: "Load demo group" }).click();
    await page.getByRole("button", { name: "Recommend Group Seats" }).click();

    // Review seat selection
    await expect(page.getByRole("heading", { name: "Review Your Group Seats" })).toBeVisible();

    // Confirm group booking
    await page.getByRole("button", { name: "Confirm Group Booking" }).click();

    // On confirmation page
    await expect(page.getByText("TripSync Combined Group Pass")).toBeVisible();

    // Check that Departure tile displays the formatted departure time matching the selected bus
    await expect(page.getByText(new RegExp(departureTime))).toBeVisible();

    // Boarding window must NOT fall back to obsolete 06:03 AM
    const boardingWindowText = await page.locator("text=/\\d{1,2}:\\d{2} (AM|PM) → \\d{1,2}:\\d{2} (AM|PM)/").innerText();
    expect(boardingWindowText).not.toContain("06:03 AM");

    // Verify localStorage has the synchronized departure date and time
    const passData = await page.evaluate(() => {
      const raw = localStorage.getItem("iqueue:group-boarding-passes:v1");
      return raw ? JSON.parse(raw)[0] : null;
    });
    expect(passData).not.toBeNull();
    expect(passData.boarding_window_start).not.toContain("T06:03");
  });
});

