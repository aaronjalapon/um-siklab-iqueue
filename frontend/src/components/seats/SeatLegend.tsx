"use client";

interface SeatLegendProps {
  variant: "passenger" | "operator";
}

const PASSENGER_ITEMS = [
  { label: "Available", className: "bg-white border border-slate-300 shadow-sm" },
  { label: "Your Assigned Seats", className: "bg-brand-blue border border-blue-700 ring-2 ring-blue-300" },
  { label: "Occupied", className: "bg-slate-500 border border-slate-600" },
  { label: "Accessibility Priority", className: "bg-amber-200 border border-amber-400" },
];

const OPERATOR_ITEMS = [
  { label: "Available", className: "bg-white border border-slate-300 shadow-sm" },
  { label: "Occupied", className: "bg-slate-500 border border-slate-600" },
  { label: "Reserved", className: "bg-brand-blue border border-blue-700 text-white" },
  { label: "Accessibility Priority", className: "bg-amber-200 border border-amber-400" },
  { label: "Blocked", className: "bg-red-100 border border-red-300" },
];

export function SeatLegend({ variant }: SeatLegendProps) {
  const items = variant === "passenger" ? PASSENGER_ITEMS : OPERATOR_ITEMS;

  return (
    <div
      className="mx-auto w-max sm:w-full max-w-full grid grid-cols-2 sm:flex sm:flex-wrap items-center sm:justify-center gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300"
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
