"use client";

interface SeatLegendProps {
  variant: "passenger" | "operator";
}

const PASSENGER_ITEMS = [
  { label: "Available", className: "bg-white border border-slate-300" },
  { label: "AI Recommended", className: "bg-teal-400 border border-teal-600" },
  { label: "Selected", className: "bg-sky-500 border border-sky-600" },
  { label: "Occupied", className: "bg-slate-200 border border-slate-400" },
  { label: "Accessibility", className: "bg-amber-200 border border-amber-400" },
];

const OPERATOR_ITEMS = [
  { label: "Available", className: "bg-white border border-slate-300" },
  { label: "Occupied", className: "bg-slate-200 border border-slate-400" },
  { label: "Reserved", className: "bg-violet-200 border border-violet-400" },
  { label: "Accessibility", className: "bg-amber-200 border border-amber-400" },
  { label: "Blocked", className: "bg-red-100 border border-red-300" },
];

export function SeatLegend({ variant }: SeatLegendProps) {
  const items = variant === "passenger" ? PASSENGER_ITEMS : OPERATOR_ITEMS;

  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-500" aria-label="Seat legend">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`inline-block w-4 h-4 rounded ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
