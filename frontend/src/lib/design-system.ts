/**
 * TripSync semantic UI primitives.
 *
 * Keep visual decisions here so passenger and operator surfaces share the same
 * hierarchy. Components should prefer these roles over one-off effects.
 */
export const uiStyles = {
  surface:
    "rounded-xl border border-ui-border bg-ui-surface text-ui-foreground",
  elevatedSurface:
    "rounded-xl border border-ui-border bg-ui-surface text-ui-foreground shadow-[0_1px_2px_rgba(11,31,51,0.08)]",
  button:
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-4 py-2 font-semibold text-ui-foreground transition-colors duration-150 hover:bg-ui-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45",
  primaryButton:
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-ui-primary bg-ui-primary px-4 py-2 font-semibold text-white transition-colors duration-150 hover:bg-ui-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-950",
  secondaryButton:
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-4 py-2 font-semibold text-ui-foreground transition-colors duration-150 hover:border-ui-primary hover:text-ui-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary focus-visible:ring-offset-2",
  successButton:
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-ui-success bg-ui-success px-4 py-2 font-semibold text-white transition-colors duration-150 hover:bg-ui-success-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-success focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45",
  input:
    "block min-h-11 w-full rounded-lg border border-ui-border bg-ui-surface px-3 py-2.5 text-ui-foreground outline-none transition-colors duration-150 placeholder:text-ui-muted-foreground focus:border-ui-primary focus:ring-2 focus:ring-ui-primary/20 disabled:cursor-not-allowed disabled:bg-ui-muted",
  statCard:
    "flex items-center gap-4 rounded-xl border border-ui-border bg-ui-surface p-5 text-ui-foreground",
  sectionTitle: "font-heading text-lg font-semibold text-ui-foreground",
  badge:
    "inline-flex items-center rounded-full border border-ui-border bg-ui-muted px-2.5 py-1 text-xs font-semibold text-ui-muted-foreground",
  skeleton: "animate-pulse rounded-lg bg-ui-muted motion-reduce:animate-none",
  segmentedControl:
    "flex gap-1 rounded-lg border border-ui-border bg-ui-muted p-1 text-xs",
  segmentedActive:
    "shrink-0 rounded-md border border-ui-border bg-ui-surface px-3 py-1.5 font-semibold text-ui-foreground",
  segmentedInactive:
    "shrink-0 cursor-pointer rounded-md px-3 py-1.5 text-ui-muted-foreground transition-colors duration-150 hover:bg-ui-surface hover:text-ui-foreground",
  navItem:
    "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 font-semibold text-slate-300 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
  navItemActive:
    "flex min-h-11 items-center gap-3 rounded-lg bg-white px-3 py-2.5 font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
  pageContainer:
    "mx-auto w-full max-w-7xl space-y-5 px-4 py-5 pb-28 sm:px-6 sm:py-7 md:pb-8 lg:px-8",
} as const;
