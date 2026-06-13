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

  // Operator dashboard stat card
  statCard:
    'bg-glass-bg backdrop-blur-xl border border-glass-border shadow-[var(--glass-shadow)] rounded-2xl p-5 flex items-center gap-4 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.25)]',

  sectionTitle: 'text-lg font-semibold text-foreground trim-cap-alpha',

  badge:
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',

  skeleton: 'animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-700/50 motion-reduce:animate-none',

  segmentedControl:
    'bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-lg p-1 border border-glass-border text-xs flex gap-1',

  segmentedActive:
    'shrink-0 px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 shadow-sm font-medium text-slate-800 dark:text-slate-100',

  segmentedInactive:
    'shrink-0 px-3 py-1.5 rounded-md text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50 transition opacity-70',

  navItem:
    'flex items-center gap-4 px-4 py-3 rounded-xl transition-colors font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white',

  navItemActive:
    'flex items-center gap-4 px-4 py-3 rounded-xl transition-colors font-semibold bg-brand-blue text-white shadow-md shadow-brand-blue/20',

  pageContainer:
    'max-w-7xl mx-auto w-full space-y-5 px-4 py-5 pb-28 sm:space-y-6 sm:px-6 sm:py-6 md:pb-6',
};
