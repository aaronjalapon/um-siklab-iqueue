import type { BookingDetail, GroupBookingResponse } from "./types";

export type SessionPass =
  | { type: "single"; booking: BookingDetail; saved_at: string }
  | { type: "group"; booking: GroupBookingResponse; saved_at: string };

const SESSION_PASS_STORAGE_KEY = "iqueue:session-passes:v1";

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveSessionSingleBooking(booking: BookingDetail): void {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    const enrichedBooking: BookingDetail = {
      ...booking,
      route_origin:
        booking.route_origin ||
        (booking.bus_id && KNOWN_BUS_ROUTES[booking.bus_id]?.origin) ||
        null,
      route_destination:
        booking.route_destination ||
        (booking.bus_id && KNOWN_BUS_ROUTES[booking.bus_id]?.destination) ||
        null,
    };

    const existing = getSessionPasses();
    const filtered = existing.filter(
      (item) => !(item.type === "single" && item.booking.id === enrichedBooking.id)
    );
    const updated: SessionPass[] = [
      {
        type: "single",
        booking: enrichedBooking,
        saved_at: new Date().toISOString(),
      },
      ...filtered,
    ];
    storage.setItem(SESSION_PASS_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
    }
  } catch {
    // Storage quota or parsing failure
  }
}

export function saveSessionGroupBooking(booking: GroupBookingResponse): void {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    const enrichedBooking: GroupBookingResponse = {
      ...booking,
      route_origin:
        booking.route_origin ||
        (booking.bus_id && KNOWN_BUS_ROUTES[booking.bus_id]?.origin) ||
        "",
      route_destination:
        booking.route_destination ||
        (booking.bus_id && KNOWN_BUS_ROUTES[booking.bus_id]?.destination) ||
        "",
    };

    const existing = getSessionPasses();
    const filtered = existing.filter(
      (item) =>
        !(item.type === "group" && item.booking.group_id === enrichedBooking.group_id)
    );
    const updated: SessionPass[] = [
      {
        type: "group",
        booking: enrichedBooking,
        saved_at: new Date().toISOString(),
      },
      ...filtered,
    ];
    storage.setItem(SESSION_PASS_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
    }
  } catch {
    // Storage quota or parsing failure
  }
}

export function getSessionPasses(): SessionPass[] {
  const storage = getSessionStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(SESSION_PASS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function getLatestSessionPass(): SessionPass | null {
  const passes = getSessionPasses();
  return passes[0] || null;
}

export function clearSessionPasses(): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(SESSION_PASS_STORAGE_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
    }
  } catch {
    // Ignore
  }
}

export const KNOWN_BUS_ROUTES: Record<string, { origin: string; destination: string }> = {
  "3eb8558f-e33e-4e5f-a273-5002f91ffc50": { origin: "Pasay", destination: "Baguio" },
  "89da1207-baf4-4ad9-996f-b96790b87b4c": { origin: "Pasay", destination: "Baguio" },
  "83d26810-5aee-477b-a088-efb14049a077": { origin: "Cubao", destination: "San Fernando" },
  "7270cafd-9861-4148-a244-8d361226b157": { origin: "Cubao", destination: "San Fernando" },
  "d1dcb36a-332e-4bda-96da-968ffb24d9b5": { origin: "Panglao", destination: "Tagbilaran" },
  "1a650d40-161c-4fc4-aa41-2ab81d681351": { origin: "Panglao", destination: "Tagbilaran" },
  "6a4ca94a-afaf-4e05-8bf5-3e4319893af0": { origin: "Tagbilaran", destination: "Jagna" },
  "a15dd1db-36a7-4e5e-a9a3-8eb0bb2939fc": { origin: "Tagbilaran", destination: "Jagna" },
  "5cd69c6c-c50c-4cfb-bfcd-057f3c022989": { origin: "Davao", destination: "Cagayan" },
  "d89d5073-d418-4b6d-ab90-f77ee5f6f333": { origin: "Davao", destination: "Cagayan" },
  "1dffd8e9-2de3-4c66-b61e-e1151338a182": { origin: "Davao", destination: "General Santos" },
  "a6323aab-c138-46a7-963a-62bfccad8525": { origin: "Davao", destination: "General Santos" },
};

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .replace(" city", "")
    .replace("de oro", "")
    .replace("gensan", "general santos")
    .trim();
}

/**
 * Calculates how many seats were booked during the active session for a given route.
 */
export function getSessionBookedSeatsForRoute(origin: string, destination: string): number {
  const passes = getSessionPasses();
  const origNorm = normalizeCity(origin);
  const destNorm = normalizeCity(destination);

  let count = 0;
  for (const pass of passes) {
    let pOrig = pass.booking.route_origin || "";
    let pDest = pass.booking.route_destination || "";

    if ((!pOrig || !pDest) && pass.booking.bus_id && KNOWN_BUS_ROUTES[pass.booking.bus_id]) {
      pOrig = pOrig || KNOWN_BUS_ROUTES[pass.booking.bus_id].origin;
      pDest = pDest || KNOWN_BUS_ROUTES[pass.booking.bus_id].destination;
    }

    const normO = normalizeCity(pOrig);
    const normD = normalizeCity(pDest);

    const originMatches = normO && (normO.includes(origNorm) || origNorm.includes(normO));
    const destMatches = normD && (normD.includes(destNorm) || destNorm.includes(normD));

    if (originMatches && destMatches) {
      if (pass.type === "group") {
        count += pass.booking.members.length;
      } else {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * Calculates how many seats were booked during the active session for a specific bus.
 */
export function getSessionBookedSeatsForBus(busId: string): number {
  const passes = getSessionPasses();
  let count = 0;
  for (const pass of passes) {
    if (pass.booking.bus_id === busId) {
      if (pass.type === "group") {
        count += pass.booking.members.length;
      } else {
        count += 1;
      }
    }
  }
  return count;
}
