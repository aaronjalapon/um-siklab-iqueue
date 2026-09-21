/**
 * Client-Side Bus Catalog and Offline Search Engine.
 *
 * Generates BusListResponse structures identical to GET /buses
 * so the search results page works seamlessly when the backend is unreachable.
 */

import { ROUTE_CATALOG, type AppRoute } from "./routes";
import { DEMO_TENANT_ID } from "./demo-config";
import {
  calculateDemoDepartureTime,
  calculateFlexibleDepartureTime,
  isDemoImmediateRoute,
} from "./departure-time";
import type { Bus, BusListResponse } from "./types";

interface OfflineRouteDefinition {
  slug: string;
  routeId: string;
  origin: string;
  destination: string;
  distanceKm: number;
  baseFare: number;
  buses: Array<{
    id: string;
    plate: string;
    capacity: number;
    defaultAvailable: number;
  }>;
}

export const OFFLINE_ROUTES: OfflineRouteDefinition[] = [
  {
    slug: "davao-cagayan",
    routeId: "26fd7e27-4920-510b-ae57-9424533347da",
    origin: "Davao City",
    destination: "Cagayan de Oro",
    distanceKm: 250,
    baseFare: 670,
    buses: [
      { id: "5cd69c6c-c50c-4cfb-bfcd-057f3c022989", plate: "DAV-001", capacity: 49, defaultAvailable: 32 },
      { id: "d89d5073-d418-4b6d-ab90-f77ee5f6f333", plate: "DAV-002", capacity: 28, defaultAvailable: 18 },
    ],
  },
  {
    slug: "davao-general-santos",
    routeId: "f55422ef-6b76-56bb-99a1-47bf020e2112",
    origin: "Davao City",
    destination: "General Santos",
    distanceKm: 170,
    baseFare: 540,
    buses: [
      { id: "1dffd8e9-2de3-4c66-b61e-e1151338a182", plate: "GEN-001", capacity: 49, defaultAvailable: 29 },
      { id: "a6323aab-c138-46a7-963a-62bfccad8525", plate: "GEN-002", capacity: 28, defaultAvailable: 16 },
    ],
  },
  {
    slug: "pasay-baguio",
    routeId: "fd3199de-6ccf-500a-aedf-3f92e0a1841c",
    origin: "Pasay",
    destination: "Baguio",
    distanceKm: 250,
    baseFare: 650,
    buses: [
      { id: "3eb8558f-e33e-4e5f-a273-5002f91ffc50", plate: "PSY-001", capacity: 49, defaultAvailable: 32 },
      { id: "89da1207-baf4-4ad9-996f-b96790b87b4c", plate: "PSY-002", capacity: 28, defaultAvailable: 19 },
    ],
  },
  {
    slug: "cubao-sanfernando",
    routeId: "28cb28dd-44e4-57b4-ba5e-ec5641608cfb",
    origin: "Cubao",
    destination: "San Fernando City",
    distanceKm: 265,
    baseFare: 480,
    buses: [
      { id: "83d26810-5aee-477b-a088-efb14049a077", plate: "CUB-001", capacity: 49, defaultAvailable: 32 },
      { id: "7270cafd-9861-4148-a244-8d361226b157", plate: "CUB-002", capacity: 28, defaultAvailable: 17 },
    ],
  },
  {
    slug: "panglao-tagbilaran",
    routeId: "447f2d3b-1ffb-55b7-96c8-d0e9ece85a25",
    origin: "Panglao",
    destination: "Tagbilaran",
    distanceKm: 22,
    baseFare: 150,
    buses: [
      { id: "d1dcb36a-332e-4bda-96da-968ffb24d9b5", plate: "BOH-001", capacity: 49, defaultAvailable: 32 },
      { id: "1a650d40-161c-4fc4-aa41-2ab81d681351", plate: "BOH-002", capacity: 28, defaultAvailable: 20 },
    ],
  },
  {
    slug: "tagbilaran-jagna",
    routeId: "4da4febe-3c2e-5158-93ed-1053a2a9d870",
    origin: "Tagbilaran",
    destination: "Jagna",
    distanceKm: 63,
    baseFare: 220,
    buses: [
      { id: "6a4ca94a-afaf-4e05-8bf5-3e4319893af0", plate: "BOH-003", capacity: 49, defaultAvailable: 1 }, // 1 remaining seat demo
      { id: "a15dd1db-36a7-4e5e-a9a3-8eb0bb2939fc", plate: "BOH-004", capacity: 28, defaultAvailable: 1 },
    ],
  },
  {
    slug: "davao-cotabato",
    routeId: "eea70a1a-7420-5c5a-85f5-8f619fb68fa2",
    origin: "Davao City",
    destination: "Cotabato City",
    distanceKm: 200,
    baseFare: 500,
    buses: [
      { id: "f0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c", plate: "DAV-003", capacity: 49, defaultAvailable: 30 },
      { id: "f1a2b3c4-d5e6-4a7b-9c0d-1e2f3a4b5c6d", plate: "DAV-004", capacity: 28, defaultAvailable: 15 },
    ],
  },
  {
    slug: "cagayan-iligan",
    routeId: "16dc0d63-62dc-56ca-933b-d5bf6a344c12",
    origin: "Cagayan de Oro",
    destination: "Iligan City",
    distanceKm: 90,
    baseFare: 400,
    buses: [
      { id: "e2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d", plate: "CDO-001", capacity: 49, defaultAvailable: 34 },
      { id: "e3b4c5d6-e7f8-4b9c-0d1e-2f3a4b5c6d7e", plate: "CDO-002", capacity: 28, defaultAvailable: 19 },
    ],
  },
  {
    slug: "davao-butuan",
    routeId: "bcb30dde-1726-5ebe-b10f-6e00d93627ac",
    origin: "Davao City",
    destination: "Butuan City",
    distanceKm: 280,
    baseFare: 620,
    buses: [
      { id: "c4d5e6f7-a8b9-4c0d-1e2f-3a4b5c6d7e8f", plate: "BUT-001", capacity: 49, defaultAvailable: 28 },
      { id: "c5d6e7f8-b9c0-4d1e-2f3a-4b5c6d7e8f9a", plate: "BUT-002", capacity: 28, defaultAvailable: 14 },
    ],
  },
  {
    slug: "cotabato-zamboanga",
    routeId: "51f3fda4-ea0f-5d02-8151-8b277dc29165",
    origin: "Cotabato City",
    destination: "Zamboanga City",
    distanceKm: 300,
    baseFare: 750,
    buses: [
      { id: "b6c7d8e9-f0a1-4b2c-3d4e-5f6a7b8c9d0e", plate: "ZAM-001", capacity: 49, defaultAvailable: 25 },
      { id: "b7c8d9e0-a1b2-4c3d-4e5f-6a7b8c9d0e1f", plate: "ZAM-002", capacity: 28, defaultAvailable: 12 },
    ],
  },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\bcity\b/g, "")
    .replace(/\bde oro\b/g, "")
    .replace(/\bgensan\b/g, "general santos")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function findMatchingOfflineRoute(
  origin: string,
  destination: string
): OfflineRouteDefinition | null {
  const normO = normalize(origin);
  const normD = normalize(destination);

  for (const def of OFFLINE_ROUTES) {
    const rO = normalize(def.origin);
    const rD = normalize(def.destination);
    if (
      (rO.includes(normO) || normO.includes(rO)) &&
      (rD.includes(normD) || normD.includes(rD))
    ) {
      return def;
    }
  }

  // Also check ROUTE_CATALOG for any route not explicitly in OFFLINE_ROUTES
  const catalogRoute = ROUTE_CATALOG.find((r: AppRoute) => {
    const cO = normalize(r.origin);
    const cD = normalize(r.destination);
    return (
      (cO.includes(normO) || normO.includes(cO)) &&
      (cD.includes(normD) || normD.includes(cD))
    );
  });

  if (catalogRoute) {
    return {
      slug: `${normalize(catalogRoute.origin)}-${normalize(catalogRoute.destination)}`,
      routeId: catalogRoute.id,
      origin: catalogRoute.origin,
      destination: catalogRoute.destination,
      distanceKm: 150,
      baseFare: 500,
      buses: [
        {
          id: `bus-49-${catalogRoute.id.slice(0, 8)}`,
          plate: `BUS-${catalogRoute.id.slice(0, 3).toUpperCase()}1`,
          capacity: 49,
          defaultAvailable: catalogRoute.passenger?.defaultAvailableSeats || 32,
        },
        {
          id: `bus-28-${catalogRoute.id.slice(0, 8)}`,
          plate: `BUS-${catalogRoute.id.slice(0, 3).toUpperCase()}2`,
          capacity: 28,
          defaultAvailable: Math.round((catalogRoute.passenger?.defaultAvailableSeats || 32) * 0.6),
        },
      ],
    };
  }

  return null;
}

export function generateOfflineBuses(
  origin: string,
  destination: string,
  travelDate: string
): BusListResponse {
  const matched = findMatchingOfflineRoute(origin, destination);
  if (!matched) {
    // Generate a fallback synthetic route if user entered custom locations
    const customRouteId = "custom-offline-route-id";
    const buses: Bus[] = [
      {
        id: "custom-bus-49",
        tenant_id: DEMO_TENANT_ID,
        route_id: customRouteId,
        capacity: 49,
        plate_number: "OFF-4901",
        origin,
        destination,
        available_seats: 32,
        accessibility_seat_count: 8,
        accessibility_available_count: 6,
        surge_probability: 0.22,
        surge_3day: [
          { date: travelDate, surge: 0.22 },
          { date: "day+1", surge: 0.25 },
          { date: "day+2", surge: 0.18 },
        ],
        fare: 500,
        departure_time: calculateFlexibleDepartureTime(0),
      },
      {
        id: "custom-bus-28",
        tenant_id: DEMO_TENANT_ID,
        route_id: customRouteId,
        capacity: 28,
        plate_number: "OFF-2802",
        origin,
        destination,
        available_seats: 18,
        accessibility_seat_count: 8,
        accessibility_available_count: 5,
        surge_probability: 0.22,
        surge_3day: [
          { date: travelDate, surge: 0.22 },
          { date: "day+1", surge: 0.25 },
          { date: "day+2", surge: 0.18 },
        ],
        fare: 450,
        departure_time: calculateFlexibleDepartureTime(1),
      },
    ];
    return {
      buses,
      total: buses.length,
      route_origin: origin,
      route_destination: destination,
    };
  }

  const isDemo = isDemoImmediateRoute(matched.origin, matched.destination);

  const buses: Bus[] = matched.buses.map((busDef, idx) => {
    const isBig = busDef.capacity >= 45;
    const fare = isBig ? matched.baseFare : Math.round((matched.baseFare * 0.9) / 10) * 10;
    const depTime = isDemo
      ? calculateDemoDepartureTime(idx)
      : calculateFlexibleDepartureTime(idx);

    const accessibilityTotal = Math.min(busDef.capacity, 8);
    const accessibilityAvailable = busDef.defaultAvailable === 1 ? 0 : Math.min(accessibilityTotal, 6);

    return {
      id: busDef.id,
      tenant_id: DEMO_TENANT_ID,
      route_id: matched.routeId,
      capacity: busDef.capacity,
      plate_number: busDef.plate,
      origin: matched.origin,
      destination: matched.destination,
      available_seats: busDef.defaultAvailable,
      accessibility_seat_count: accessibilityTotal,
      accessibility_available_count: accessibilityAvailable,
      surge_probability: isDemo ? 0.35 : 0.24,
      surge_3day: [
        { date: travelDate, surge: isDemo ? 0.35 : 0.24 },
        { date: "day+1", surge: 0.28 },
        { date: "day+2", surge: 0.19 },
      ],
      fare,
      departure_time: depTime,
    };
  });

  return {
    buses,
    total: buses.length,
    route_origin: matched.origin,
    route_destination: matched.destination,
  };
}
