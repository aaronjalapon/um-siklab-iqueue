"use client";

interface SeatLegendProps {
  variant: "passenger" | "operator";
}

const PASSENGER_ITEMS = [
  { label: "Available", className: "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 shadow-xs" },
  { label: "Your Assigned Seats", className: "bg-ui-primary border border-ui-primary ring-2 ring-ui-primary/30 text-white" },
  { label: "Occupied", className: "bg-slate-200 border border-slate-300 dark:bg-slate-700 dark:border-slate-600" },
  { label: "Accessibility Priority", className: "bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-500" },
];

const OPERATOR_ITEMS = [
  { label: "Available", className: "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 shadow-xs" },
  { label: "Occupied", className: "bg-slate-200 border border-slate-300 dark:bg-slate-700 dark:border-slate-600" },
  { label: "Reserved", className: "bg-ui-primary border border-ui-primary text-white" },
  { label: "Accessibility Priority", className: "bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-500" },
  { label: "Blocked", className: "bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800" },
];

export function SeatLegend({ variant }: SeatLegendProps) {
  const items = variant === "passenger" ? PASSENGER_ITEMS : OPERATOR_ITEMS;

  return (
    <div
      className="mx-auto w-max sm:w-full max-w-full grid grid-cols-2 sm:flex sm:flex-wrap items-center sm:justify-center gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-2 text-[11px] sm:text-xs text-ui-muted-foreground"
      aria-label="Seat legend"
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
          <span className={`inline-block w-3.5 h-3.5 sm:w-4 sm:h-4 rounded shrink-0 ${item.className}`} />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}
