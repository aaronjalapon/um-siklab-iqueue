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

export function saveGroupBookingDraft(
  draft: Omit<GroupBookingDraft, "id" | "savedAt">
): string {
  const id = crypto.randomUUID();
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
