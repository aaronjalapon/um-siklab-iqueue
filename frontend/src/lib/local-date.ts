export function getLocalDateInputValue(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isPastLocalDate(value: string, today = getLocalDateInputValue()): boolean {
  return Boolean(value) && value < today;
}

export function parseDepartureTimeTo24Hour(
  timeStr?: string | null
): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3] ? match[3].toUpperCase() : null;
  if (ampm === "PM" && hours < 12) {
    hours += 12;
  } else if (ampm === "AM" && hours === 12) {
    hours = 0;
  }
  return { hours, minutes };
}

export function toServiceDepartureIso(
  value: string,
  departureTime?: string | null
): string {
  if (value.includes("T") && !departureTime) {
    return new Date(value).toISOString();
  }
  const datePart = value.includes("T") ? value.split("T")[0] : value;
  const parsedTime = parseDepartureTimeTo24Hour(departureTime);
  const hh = parsedTime ? String(parsedTime.hours).padStart(2, "0") : "06";
  const mm = parsedTime ? String(parsedTime.minutes).padStart(2, "0") : "00";
  return new Date(`${datePart}T${hh}:${mm}:00+08:00`).toISOString();
}
