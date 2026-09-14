import type { GroupMemberRequest, GroupSharedPreferences } from "./types";

export const GROUP_DRAFT_STORAGE_KEY = "iqueue:group-booking-drafts:v1";

export interface GroupBookingDraft {
  id: string;
  busId: string;
  date: string;
  origin: string;
  destination: string;
  members: GroupMemberRequest[];
  preferences: GroupSharedPreferences;
  savedAt: string;
}

function readAll(): Record<string, GroupBookingDraft> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(GROUP_DRAFT_STORAGE_KEY) || "{}") as Record<
      string,
      GroupBookingDraft
    >;
  } catch {
    return {};
  }
}

function generateUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to fallback
    }
  }

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    try {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // RFC4122 version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC4122 variant 10xx
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch {
      // Fall through to Math.random fallback
    }
  }

  // Universal RFC4122 v4 fallback for non-secure contexts (LAN HTTP on mobile devices)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function saveGroupBookingDraft(
  draft: Omit<GroupBookingDraft, "id" | "savedAt">
): string {
  const id = generateUUID();
  const drafts = readAll();
  drafts[id] = { ...draft, id, savedAt: new Date().toISOString() };
  sessionStorage.setItem(GROUP_DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  return id;
}

export function getGroupBookingDraft(id: string): GroupBookingDraft | null {
  return readAll()[id] || null;
}

export function removeGroupBookingDraft(id: string): void {
  const drafts = readAll();
  delete drafts[id];
  sessionStorage.setItem(GROUP_DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}
