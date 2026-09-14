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
    const existing = getSessionPasses();
    const filtered = existing.filter(
      (item) => !(item.type === "single" && item.booking.id === booking.id)
    );
    const updated: SessionPass[] = [
      {
        type: "single",
        booking,
        saved_at: new Date().toISOString(),
      },
      ...filtered,
    ];
    storage.setItem(SESSION_PASS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage quota or parsing failure
  }
}

export function saveSessionGroupBooking(booking: GroupBookingResponse): void {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    const existing = getSessionPasses();
    const filtered = existing.filter(
      (item) =>
        !(item.type === "group" && item.booking.group_id === booking.group_id)
    );
    const updated: SessionPass[] = [
      {
        type: "group",
        booking,
        saved_at: new Date().toISOString(),
      },
      ...filtered,
    ];
    storage.setItem(SESSION_PASS_STORAGE_KEY, JSON.stringify(updated));
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
  } catch {
    // Ignore
  }
}
