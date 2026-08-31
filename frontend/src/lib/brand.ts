export const BRAND = {
  name: "TripSync",
  tagline: "Board smart, travel smarter.",
  operatorName: "TripSync Ops",
  assistantName: "TripSync Assistant",
  description:
    "AI-powered smart boarding platform for inter-provincial bus terminals across ASEAN.",
  shortDescription:
    "AI-powered smart boarding and QR passes for inter-provincial bus terminals.",
} as const;

export function applyFrontendBrand(text: string): string {
  return text.replace(/\bIQueue\b/gi, BRAND.name);
}
