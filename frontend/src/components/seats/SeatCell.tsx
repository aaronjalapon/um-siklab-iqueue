"use client";

import {
  Accessibility,
  Check,
  Star,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { SeatMapEntry, SeatCellState } from "@/types/seat";

interface SeatCellProps {
  seat: SeatMapEntry;
  state: SeatCellState;
  onClick?: (seat: SeatMapEntry) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  groupAssignment?: {
    member_index: number;
    member_name: string;
    is_accessibility: boolean;
  };
}

const STATE_STYLES: Record<SeatCellState, string> = {
  available:
    "bg-white border-slate-300 text-slate-900 shadow-sm hover:bg-blue-50 hover:border-blue-400 cursor-pointer",
  occupied:
    "bg-slate-500 border-slate-600 text-white font-medium cursor-not-allowed",
  selected: "bg-brand-blue border-blue-700 text-white font-bold ring-2 ring-blue-300 shadow-md",
  auto_assigned:
    "bg-brand-blue border-blue-700 text-white font-bold ring-2 ring-blue-400 ring-offset-1 shadow-md animate-pulse",
  group_reserved: "bg-brand-blue border-blue-700 text-white font-bold ring-2 ring-blue-400 shadow-md",
  accessibility: "bg-amber-200 border-amber-400 text-amber-800 cursor-pointer hover:bg-amber-300",
  blocked: "bg-red-100 border-red-300 text-red-300 cursor-not-allowed",
};

const STATE_ICONS: Partial<Record<SeatCellState, LucideIcon>> = {
  selected: Check,
  auto_assigned: Star,
  group_reserved: Users,
  accessibility: Accessibility,
  blocked: X,
};

const SIZE_CLASSES = {
  sm: "w-7 h-7 text-[9px] sm:w-8 sm:h-8 sm:text-[10px]",
  md: "w-8 h-8 text-[10px] sm:w-10 sm:h-10 sm:text-xs",
};

export function SeatCell({
  seat,
  state,
  onClick,
  size = "md",
  disabled = false,
  groupAssignment,
}: SeatCellProps) {
  const isInteractive =
    Boolean(onClick) &&
    !disabled &&
    (state === "available" ||
      state === "auto_assigned" ||
      state === "accessibility");

  const baseClasses =
    "rounded font-medium transition-all duration-200 flex items-center justify-center relative border";
  const stateClasses = groupAssignment
    ? groupAssignment.is_accessibility
      ? "bg-amber-400 border-blue-600 text-amber-950 font-bold ring-2 ring-blue-500 shadow-md"
      : "bg-brand-blue border-blue-700 text-white font-bold ring-2 ring-blue-300 shadow-md"
    : STATE_STYLES[state] || STATE_STYLES.available;
  const sizeClasses = SIZE_CLASSES[size];
  const Icon = STATE_ICONS[state];

  const handleClick = () => {
    if (isInteractive && onClick) {
      onClick(seat);
    }
  };

  const Component = isInteractive ? "button" : "div";

  const colIndex =
    seat.col_number ||
    (seat.seat_label
      ? seat.seat_label.charCodeAt(seat.seat_label.length - 1) - 64
      : 1);

  const zIndex = groupAssignment
    ? 40 - colIndex
    : state === "selected" || state === "auto_assigned"
    ? 20
    : 1;

  return (
    <Component
      type={isInteractive ? "button" : undefined}
      className={`${baseClasses} ${stateClasses} ${sizeClasses} ${
        disabled ? "cursor-not-allowed opacity-35" : ""
      }`}
      style={{ zIndex }}
      onClick={isInteractive ? handleClick : undefined}
      disabled={Component === "button" ? !isInteractive : undefined}
      aria-disabled={!isInteractive || undefined}
      title={`Seat ${seat.seat_label} · ${seat.seat_type} · ${seat.side}${seat.is_accessibility ? " · accessibility-priority" : ""}${groupAssignment ? ` · assigned to ${groupAssignment.member_name}` : ""}${state === "auto_assigned" ? " (AI Recommended)" : ""}${disabled ? " · unavailable for accessibility request" : ""}`}
      aria-label={`Seat ${seat.seat_label}, ${groupAssignment ? `group assignment ${groupAssignment.member_index + 1}, ${groupAssignment.member_name}` : state.replace("_", " ")}${seat.is_accessibility ? ", accessibility priority" : ""}${disabled ? ", unavailable for accessibility request" : ""}`}
    >
      {seat.seat_label}
      {groupAssignment ? (
        <span
          className={`absolute -right-1.5 -top-1.5 z-30 pointer-events-none inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-extrabold shadow-md ring-1 ${
            groupAssignment.is_accessibility
              ? "bg-amber-950 text-amber-200 ring-amber-400"
              : "bg-slate-950 text-white ring-white"
          }`}
          aria-hidden
        >
          {groupAssignment.member_index + 1}
        </span>
      ) : Icon && (
        <span
          className="absolute -right-1 -top-1 z-20 pointer-events-none inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/90 text-[8px] leading-none shadow-sm"
          aria-hidden
        >
          <Icon className="h-2.5 w-2.5" />
        </span>
      )}
    </Component>
  );
}
