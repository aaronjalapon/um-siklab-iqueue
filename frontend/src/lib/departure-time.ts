/**
 * Flexible Departure Time Utility
 *
 * Rule:
 * Calculates departure time 5 hours from booking time, rounded to the nearest hour:
 * - If minute < 30: round down to hour:00
 * - If minute >= 30: round up to (hour + 1):00
 *
 * Test cases:
 * - 8:17 AM + 5h = 13:17 -> 1:00 PM
 * - 3:48 PM (15:48) + 5h = 20:48 -> 9:00 PM
 *
 * Spacing:
 * - Multiple buses on the same route are offset by 2 hours each.
 */
export function isDemoImmediateRoute(
  origin?: string | null,
  destination?: string | null
): boolean {
  if (!origin || !destination) return false;
  const orig = origin.trim().toLowerCase();
  const dest = destination.trim().toLowerCase();
  const isCubaoSf = orig.includes("cubao") && dest.includes("san fernando");
  const isPasayBaguio = orig.includes("pasay") && dest.includes("baguio");
  return isCubaoSf || isPasayBaguio;
}

/**
 * Demo Route Immediate Departure Time Utility
 *
 * For designated live-demo routes (Cubao -> San Fernando City & Pasay -> Baguio),
 * departure time is calculated dynamically ~1h30m from the current time, rounded to the next
 * 30-minute block (e.g. 1:55 PM + 90m -> 3:25 PM -> rounds to 3:30 PM).
 *
 * This guarantees the departure is within [60m, 115m) from current time, which strictly satisfies
 * the 120-minute gate boarding window for immediate successful scanning by the operator.
 */
export function calculateDemoDepartureTime(
  busIndex = 0,
  baseDate: Date = new Date()
): string {
  void busIndex;
  const nowMs = baseDate.getTime();
  let baseTarget = new Date(nowMs + 90 * 60 * 1000);
  const rem = baseTarget.getMinutes() % 30;
  if (rem !== 0) {
    baseTarget = new Date(baseTarget.getTime() + (30 - rem) * 60 * 1000);
  }
  if (baseTarget.getTime() - nowMs > 115 * 60 * 1000) {
    baseTarget = new Date(baseTarget.getTime() - 30 * 60 * 1000);
  }
  const target = baseTarget;

  const hours24 = target.getHours();
  const period = hours24 >= 12 ? "PM" : "AM";
  const displayHour = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const displayMinute = String(target.getMinutes()).padStart(2, "0");

  return `${displayHour}:${displayMinute} ${period}`;
}

export function calculateFlexibleDepartureTime(
  busIndex = 0,
  baseDate: Date = new Date()
): string {
  const currentHour = baseDate.getHours();
  const currentMinute = baseDate.getMinutes();

  const rawTargetHour = currentHour + 5 + busIndex * 2;
  const roundedHour24 =
    (currentMinute >= 30 ? rawTargetHour + 1 : rawTargetHour) % 24;

  const period = roundedHour24 >= 12 ? "PM" : "AM";
  const displayHour = roundedHour24 % 12 === 0 ? 12 : roundedHour24 % 12;

  return `${displayHour}:00 ${period}`;
}

