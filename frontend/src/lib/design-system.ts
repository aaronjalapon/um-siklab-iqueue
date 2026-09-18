/**
 * TripSync semantic UI primitives.
 *
 * Keep visual decisions here so passenger and operator surfaces share the same
 * hierarchy. Components should prefer these roles over one-off effects.
 */
export const uiStyles = {
  surface:
    "clay-surface rounded-[var(--clay-radius-card)] border border-ui-border bg-ui-surface text-ui-foreground",
  elevatedSurface:
    "clay-surface-raised rounded-[var(--clay-radius-panel)] border border-ui-border bg-ui-surface text-ui-foreground",
  insetSurface:
    "clay-inset rounded-[var(--clay-radius-control)] border border-ui-border bg-ui-surface-soft text-ui-foreground",
  dataWell:
    "clay-data-well rounded-[var(--clay-radius-control)] border border-ui-border bg-ui-surface-soft text-ui-foreground",
  button:
    "clay-control clay-interactive inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-ui-border bg-ui-surface px-4 py-2 font-semibold text-ui-foreground hover:border-ui-primary/55 hover:text-ui-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45",
  primaryButton:
    "clay-action inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-ui-primary bg-ui-primary px-4 py-2 font-semibold text-white hover:bg-ui-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:text-ui-navy",
  secondaryButton:
    "clay-control clay-interactive inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-ui-border bg-ui-surface px-4 py-2 font-semibold text-ui-foreground hover:border-ui-primary hover:text-ui-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary focus-visible:ring-offset-2",
  successButton:
    "clay-action-success inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-ui-success bg-ui-success px-4 py-2 font-semibold text-white hover:bg-ui-success-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-success focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45",
  input:
    "clay-control block min-h-11 w-full rounded-xl border border-ui-border bg-ui-surface px-3 py-2.5 text-ui-foreground outline-none placeholder:text-ui-muted-foreground focus:border-ui-primary focus:ring-2 focus:ring-ui-primary/20 disabled:cursor-not-allowed disabled:bg-ui-muted disabled:text-ui-muted-foreground",
  statCard:
    "clay-surface-low flex items-center gap-4 rounded-[var(--clay-radius-card)] border border-ui-border bg-ui-surface p-5 text-ui-foreground",
  sectionTitle: "font-heading text-lg font-semibold text-ui-foreground",
  badge:
    "clay-badge inline-flex items-center gap-1 rounded-full border border-ui-border bg-ui-muted px-2.5 py-1 text-xs font-semibold text-ui-muted-foreground",
  skeleton: "clay-inset animate-pulse rounded-xl bg-ui-muted motion-reduce:animate-none",
  segmentedControl:
    "clay-inset flex gap-1 rounded-xl border border-ui-border bg-ui-muted p-1 text-xs",
  segmentedActive:
    "clay-surface-low shrink-0 rounded-lg border border-ui-border bg-ui-surface px-3 py-1.5 font-semibold text-ui-foreground",
  segmentedInactive:
    "shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-ui-muted-foreground transition-colors duration-150 hover:bg-ui-surface hover:text-ui-foreground",
  navItem:
    "flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 font-semibold text-slate-600 transition-[background-color,color,box-shadow,transform] duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary active:translate-y-px",
  navItemActive:
    "flex min-h-11 items-center gap-3 rounded-xl bg-ui-primary px-4 py-2.5 font-semibold text-white shadow-sm shadow-ui-primary/25 dark:border dark:border-white/70 dark:bg-white dark:text-slate-950 dark:shadow-[7px_8px_18px_rgba(0,0,0,0.30),inset_1px_1px_0_rgba(255,255,255,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary",
  pageContainer:
    "mx-auto w-full max-w-7xl space-y-5 px-4 py-5 pb-28 sm:px-6 sm:py-7 md:pb-8 lg:px-8",
} as const;
