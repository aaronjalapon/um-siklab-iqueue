import type { LenisOptions } from "lenis";

/**
 * Shared configuration options for Lenis smooth scrolling.
 * Tuned for a silky, responsive feel on the passenger web experience.
 */
export const LENIS_OPTIONS: LenisOptions = {
  duration: 1.2,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential ease-out
  smoothWheel: true,
  syncTouch: false, // Keep native touch gestures on mobile devices
  touchMultiplier: 1.5,
  infinite: false,
};
