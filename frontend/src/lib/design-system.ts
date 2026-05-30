/**
 * IQueue Design System Utilities
 * 
 * Standardized class strings for the Glassmorphism UI to ensure consistency
 * across the Passenger and Operator applications.
 * These utilize the custom CSS variables mapped in Tailwind v4 `@theme inline`.
 */

export const glassStyles = {
  // Base frosted glass panel with shadow and subtle border
  panel: 'bg-glass-bg backdrop-blur-xl border border-glass-border shadow-[var(--glass-shadow)] rounded-2xl',
  
  // Interactive glass button (e.g. for booking)
  button: 'bg-glass-bg hover:bg-white/40 dark:hover:bg-slate-800/60 backdrop-blur-md border border-glass-border rounded-xl transition-all duration-300 shadow-[var(--glass-shadow)] text-foreground trim-cap-alpha',
  
  // Primary action button (solid with glass highlights)
  primaryButton: 'bg-brand-blue hover:bg-blue-600 text-white border border-blue-500 rounded-xl transition-colors duration-300 shadow-lg shadow-blue-500/20 trim-cap-alpha px-4 py-2',
  
  // Secondary action button (orange highlight)
  secondaryButton: 'bg-brand-orange hover:bg-orange-600 text-white border border-orange-500 rounded-xl transition-colors duration-300 shadow-lg shadow-orange-500/20 trim-cap-alpha px-4 py-2',

  // Input field (frosted inner inset)
  input: 'bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-glass-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 transition-all text-foreground',
};
