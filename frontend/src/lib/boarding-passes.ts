import type { BookingDetail } from "./types";

export const BOARDING_PASS_STORAGE_KEY = "iqueue:boarding-passes:v1";

const MAX_SAVED_PASSES = 5;
const PASS_EXPIRY_MS = 24 * 60 * 60 * 1000;

export type SavedBoardingPass = BookingDetail & {
  saved_at: string;
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isExpired(pass: Pick<BookingDetail, "departure_date">): boolean {
  const departureTime = new Date(pass.departure_date).getTime();
  if (Number.isNaN(departureTime)) return false;
  return Date.now() > departureTime + PASS_EXPIRY_MS;
}

function sanitizeBooking(booking: BookingDetail): SavedBoardingPass {
  return {
    id: booking.id,
    passenger_id: booking.passenger_id,
    bus_id: booking.bus_id,
    seat_number: booking.seat_number,
    boarding_window_start: booking.boarding_window_start,
    boarding_window_end: booking.boarding_window_end,
    status: booking.status,
    qr_token: booking.qr_token,
    departure_date: booking.departure_date,
    created_at: booking.created_at,
    passenger_name: booking.passenger_name,
    route_origin: booking.route_origin,
    route_destination: booking.route_destination,
    saved_at: new Date().toISOString(),
  };
}

function readStoredPasses(): SavedBoardingPass[] {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(BOARDING_PASS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedBoardingPass => {
      return (
        item &&
        typeof item.id === "string" &&
        typeof item.bus_id === "string" &&
        typeof item.passenger_id === "string" &&
        typeof item.seat_number === "string" &&
        typeof item.departure_date === "string"
      );
    });
  } catch {
    return [];
  }
}

function writeStoredPasses(passes: SavedBoardingPass[]): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(BOARDING_PASS_STORAGE_KEY, JSON.stringify(passes));
}

export function getSavedBoardingPasses(): SavedBoardingPass[] {
  const passes = readStoredPasses()
    .filter((pass) => !isExpired(pass))
    .sort(
      (a, b) =>
        new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
    )
    .slice(0, MAX_SAVED_PASSES);

  writeStoredPasses(passes);
  return passes;
}

export function getSavedBoardingPassById(
  bookingId: string
): SavedBoardingPass | null {
  return getSavedBoardingPasses().find((pass) => pass.id === bookingId) ?? null;
}

export function saveBoardingPass(booking: BookingDetail): void {
  if (booking.status.toLowerCase() !== "confirmed") return;

  const savedPass = sanitizeBooking(booking);
  const nextPasses = [
    savedPass,
    ...getSavedBoardingPasses().filter((pass) => pass.id !== booking.id),
  ].slice(0, MAX_SAVED_PASSES);

  writeStoredPasses(nextPasses);
}
