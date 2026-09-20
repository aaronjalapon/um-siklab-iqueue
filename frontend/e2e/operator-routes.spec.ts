import { expect, test } from "@playwright/test";

const OPERATOR_ROUTE_LABELS = [
  "Davao → Cagayan de Oro",
  "Davao → Cotabato",
  "Davao → General Santos",
  "Cagayan de Oro → Iligan",
  "Davao → Butuan",
  "Cotabato → Zamboanga",
  "Pasay → Baguio",
  "Cubao → San Fernando City",
  "Panglao → Tagbilaran",
  "Tagbilaran → Jagna",
] as const;

const ADDED_ROUTES = [
  {
    id: "fd3199de-6ccf-500a-aedf-3f92e0a1841c",
    label: "Pasay → Baguio",
    origin: "Pasay",
    destination: "Baguio",
    plates: ["PSY-001", "PSY-002"],
  },
  {
    id: "28cb28dd-44e4-57b4-ba5e-ec5641608cfb",
    label: "Cubao → San Fernando City",
    origin: "Cubao",
    destination: "San Fernando City",
    plates: ["CUB-001", "CUB-002"],
  },
  {
    id: "447f2d3b-1ffb-55b7-96c8-d0e9ece85a25",
    label: "Panglao → Tagbilaran",
    origin: "Panglao",
    destination: "Tagbilaran",
    plates: ["BOH-001", "BOH-002"],
  },
  {
    id: "4da4febe-3c2e-5158-93ed-1053a2a9d870",
    label: "Tagbilaran → Jagna",
    origin: "Tagbilaran",
    destination: "Jagna",
    plates: ["BOH-003", "BOH-004"],
  },
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("iqueue:pwa-install-dismissed:v1", String(Date.now()));
  });
  await page.route("**/api/v1/**", (route) => route.abort());
});

test("operator dashboard and fleet overview expose the same 10 unique routes", async ({
  page,
}) => {
  await page.goto("/operator");
  const dashboardRoute = page.getByLabel("Forecast route");
  await expect(dashboardRoute.locator("option")).toHaveCount(10);
  await expect(dashboardRoute.locator("option")).toHaveText(OPERATOR_ROUTE_LABELS);

  await page.goto("/operator/buses");
  const fleetRoute = page.getByLabel("Route");
  await expect(fleetRoute.locator("option")).toHaveCount(10);
  await expect(fleetRoute.locator("option")).toHaveText(OPERATOR_ROUTE_LABELS);
});

test("new operator routes request their canonical forecast and fleet data", async ({
  page,
}) => {
  await page.goto("/operator");
  const routeSelect = page.getByLabel("Forecast route");

  for (const route of ADDED_ROUTES) {
    const forecastRequest = page.waitForRequest((request) =>
      request.url().endsWith(`/forecasts/${route.id}`)
    );
    const fleetRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        url.pathname.endsWith("/buses") &&
        url.searchParams.get("origin") === route.origin &&
        url.searchParams.get("destination") === route.destination
      );
    });

    await routeSelect.selectOption(route.id);
    await Promise.all([forecastRequest, fleetRequest]);
    await expect(page.getByText(`Route: ${route.label}`)).toBeVisible();
  }
});

test("offline demo fleet stays isolated to the selected added route", async ({
  page,
}) => {
  await page.goto("/operator/buses");
  const routeSelect = page.getByLabel("Route");

  for (const route of ADDED_ROUTES) {
    await routeSelect.selectOption({ label: route.label });
    await expect(page.getByText(route.plates[0], { exact: true })).toBeVisible();
    await expect(page.getByText(route.plates[1], { exact: true })).toBeVisible();

    const unrelatedPlate =
      route.plates[0] === ADDED_ROUTES[0].plates[0]
        ? ADDED_ROUTES[1].plates[0]
        : ADDED_ROUTES[0].plates[0];
    await expect(page.getByText(unrelatedPlate, { exact: true })).toHaveCount(0);
  }
});
