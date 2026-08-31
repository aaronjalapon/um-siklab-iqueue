import type { GroupBookingResponse } from "./types";

export const GROUP_PASS_STORAGE_KEY = "iqueue:group-boarding-passes:v1";

export function saveGroupBoardingPass(pass: GroupBookingResponse): void {
  if (typeof window === "undefined") return;
  const saved = getSavedGroupBoardingPasses();
  const next = [pass, ...saved.filter((item) => item.group_id !== pass.group_id)].slice(0, 10);
  localStorage.setItem(GROUP_PASS_STORAGE_KEY, JSON.stringify(next));
}

export function getSavedGroupBoardingPasses(): GroupBookingResponse[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(GROUP_PASS_STORAGE_KEY) || "[]") as GroupBookingResponse[];
  } catch {
    return [];
  }
}

export function getSavedGroupBoardingPass(groupId: string): GroupBookingResponse | null {
  return getSavedGroupBoardingPasses().find((item) => item.group_id === groupId) || null;
}
