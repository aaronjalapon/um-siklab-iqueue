"use client";

import type { SeatMapEntry, SeatCellState } from "@/types/seat";

interface SeatCellProps {
  seat: SeatMapEntry;
  state: SeatCellState;
  onClick?: (seat: SeatMapEntry) => void;
  size?: "sm" | "md";
}

const STATE_STYLES: Record<SeatCellState, string> = {
  available: "bg-white border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-400 cursor-pointer",
  occupied: "bg-slate-200 border-slate-400 text-slate-400 cursor-not-allowed",
  selected: "bg-sky-500 border-sky-600 text-white ring-2 ring-sky-300",
  auto_assigned:
    "bg-teal-400 border-teal-600 text-white ring-2 ring-teal-400 ring-offset-1 animate-pulse",
  group_reserved: "bg-violet-200 border-violet-400 text-violet-700",
  accessibility: "bg-amber-200 border-amber-400 text-amber-800 cursor-pointer hover:bg-amber-300",
  blocked: "bg-red-100 border-red-300 text-red-300 cursor-not-allowed",
};

const STATE_ICONS: Partial<Record<SeatCellState, string>> = {
  selected: "✓",
  auto_assigned: "★",
  group_reserved: "G",
  accessibility: "♿",
  blocked: "✕",
};

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-[10px]",
  md: "w-9 h-9 text-[11px] sm:w-10 sm:h-10 sm:text-xs",
};

export function SeatCell({
  seat,
  state,
  onClick,
  size = "md",
}: SeatCellProps) {
  const isInteractive =
    state === "available" || state === "auto_assigned" || state === "accessibility";

  const baseClasses =
    "rounded font-medium transition-all duration-200 flex items-center justify-center relative border";
  const stateClasses = STATE_STYLES[state] || STATE_STYLES.available;
  const sizeClasses = SIZE_CLASSES[size];
  const icon = STATE_ICONS[state];

  const handleClick = () => {
    if (isInteractive && onClick) {
      onClick(seat);
    }
  };

  const Component = isInteractive ? "button" : "div";

  return (
    <Component
      type={isInteractive ? "button" : undefined}
      className={`${baseClasses} ${stateClasses} ${sizeClasses}`}
      onClick={isInteractive ? handleClick : undefined}
      disabled={!isInteractive}
      title={`Seat ${seat.seat_label} · ${seat.seat_type} · ${seat.side}${state === "auto_assigned" ? " (AI Recommended)" : ""}`}
      aria-label={`Seat ${seat.seat_label}, ${state.replace("_", " ")}`}
    >
      {seat.seat_label}
      {icon && (
        <span className="absolute -top-1 -right-1 text-[8px] leading-none" aria-hidden>
          {icon}
        </span>
      )}
    </Component>
  );
}
