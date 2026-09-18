import { expect, test, type Page } from "@playwright/test";

const widths = [375, 768, 1024, 1440] as const;
const themes = ["light", "dark"] as const;
const pages = [
  { name: "landing", path: "/", fullPage: true },
  { name: "booking-search", path: "/buy", fullPage: true },
  {
    name: "seat-selection",
    path: "/book/visual-bus/seat-selection?date=2026-09-18&origin=Davao%20City&dest=Cagayan%20de%20Oro&name=Alex%20Santos&phone=%2B639171234567&preferred_seat_type=window&affinity_opt_in=true",
    fullPage: true,
  },
  { name: "boarding-pass", path: "/confirmation/visual-booking", fullPage: true },
  { name: "operator-dashboard", path: "/operator", fullPage: true },
] as const;

const seatMap = Array.from({ length: 32 }, (_, index) => {
  const row = Math.floor(index / 4) + 1;
  const column = index % 4;
  const letter = ["A", "B", "C", "D"][column];
  return {
    seat_id: `seat-${row}-${letter}`,
    seat_label: `${row}${letter}`,
    row_number: row,
    col_number: column + 1,
    seat_type: column === 0 || column === 3 ? "window" : "aisle",
    side: column < 2 ? "left" : "right",
    is_near_exit: row <= 2,
    is_accessibility: row === 1,
    status: ["2B", "3C", "5A", "6D"].includes(`${row}${letter}`)
      ? "occupied"
      : "available",
  };
});

async function installJourneyFixtures(page: Page) {
  await page.route("**/api/v1/seats/bus/visual-bus**", (route) =>
    route.fulfill({ json: seatMap })
  );
  await page.route("**/api/v1/seats/assign", (route) =>
    route.fulfill({
      json: {
        seat_id: "seat-4-A",
        seat_label: "4A",
        seat_type: "window",
        side: "left",
        row_number: 4,
        is_accessibility: false,
        affinity_score: 86,
        score_breakdown: { preference: 50, availability: 36 },
        assignment_reasons: ["Matches your window preference", "Available beside a quiet-seat preference"],
        boarding_window: "05:30–05:45",
      },
    })
  );
  await page.route("**/api/v1/bookings/visual-booking", (route) =>
    route.fulfill({
      json: {
        id: "visual-booking",
        passenger_id: "visual-passenger",
        passenger_name: "Alex Santos",
        bus_id: "visual-bus",
        group_id: null,
        seat_number: "4A",
        boarding_window_start: "2026-09-18T05:30:00+08:00",
        boarding_window_end: "2026-09-18T05:45:00+08:00",
        status: "confirmed",
        qr_token: "tripsync.visual.signed-boarding-token",
        departure_date: "2026-09-18T06:00:00+08:00",
        created_at: "2026-09-17T09:00:00+08:00",
        route_origin: "Davao City",
        route_destination: "Cagayan de Oro",
      },
    })
  );
  await page.route("**/api/v1/forecasts/**", (route) =>
    route.fulfill({ status: 503, json: { detail: "Visual fixture: forecast unavailable" } })
  );
  await page.route("**/api/v1/buses?**", (route) =>
    route.fulfill({ status: 503, json: { detail: "Visual fixture: fleet unavailable" } })
  );
  await page.route("**/api/v1/forecast-actions/summary**", (route) =>
    route.fulfill({ status: 503, json: { detail: "Visual fixture: learning summary unavailable" } })
  );
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chrome",
    "The visual matrix sets its own canonical viewport widths."
  );
  await page.addInitScript(() => {
    localStorage.setItem("iqueue:pwa-install-dismissed:v1", String(Date.now()));
    localStorage.removeItem("tripsync:theme:v1");
  });
  await installJourneyFixtures(page);
});

for (const width of widths) {
  for (const theme of themes) {
    for (const target of pages) {
      test(`${target.name} remains stable in ${theme} mode at ${width}px`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
        await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
        await page.goto(target.path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("main")).toBeVisible();
        if (target.name === "seat-selection") {
          await expect(page.getByText("Seat 4A")).toBeVisible();
        }
        if (target.name === "boarding-pass") {
          await expect(page.getByText("TripSync Boarding Pass")).toBeVisible();
        }
        await expect(page).toHaveScreenshot(`${target.name}-${theme}-${width}.png`, {
          animations: "disabled",
          fullPage: target.fullPage,
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  }
}
