/** Utility functions for the IQueue frontend. */

/**
 * Format a date string for display.
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a time string for display.
 */
export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a boarding window (start → end) for display.
 */
export function formatBoardingWindow(start: string, end: string): string {
  return `${formatTime(start)} → ${formatTime(end)}`;
}

/**
 * Get a color class for surge probability levels.
 */
export function surgeColorClass(probability: number | null): string {
  if (probability === null) return "bg-gray-200 text-gray-600";
  if (probability < 0.4) return "bg-green-100 text-green-800";
  if (probability < 0.7) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

/**
 * Get a surge level label.
 */
export function surgeLabel(probability: number | null): string {
  if (probability === null) return "Unknown";
  if (probability < 0.4) return "Low";
  if (probability < 0.7) return "Moderate";
  return "High";
}

/**
 * Get a color class for booking status.
 */
export function statusColorClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "boarded":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "missed":
      return "bg-red-100 text-red-800";
    case "cancelled":
      return "bg-gray-200 text-gray-600";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/**
 * Language display names.
 */
export const LANGUAGE_LABELS: Record<string, string> = {
  fil: "Filipino",
  en: "English",
  id: "Bahasa Indonesia",
  vi: "Tiếng Việt",
  ms: "Bahasa Melayu",
  zh: "中文",
  ceb: "Cebuano",
  jv: "Jawa",
};
