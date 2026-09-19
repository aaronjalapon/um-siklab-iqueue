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
