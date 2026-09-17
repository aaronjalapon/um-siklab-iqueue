export function getLocalDateInputValue(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isPastLocalDate(value: string, today = getLocalDateInputValue()): boolean {
  return Boolean(value) && value < today;
}

export function toServiceDepartureIso(value: string): string {
  return new Date(`${value}T06:00:00+08:00`).toISOString();
}
