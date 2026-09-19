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
    "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 shadow-xs hover:border-ui-primary cursor-pointer",
  occupied:
    "bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed",
  selected: "bg-ui-primary border border-ui-primary text-white font-bold ring-2 ring-ui-primary/30 shadow-sm",
  auto_assigned:
    "seat-recommended bg-ui-primary border border-ui-primary text-white font-bold ring-2 ring-ui-primary/30 ring-offset-1 shadow-sm",
  group_reserved: "bg-ui-primary border border-ui-primary text-white font-bold ring-2 ring-ui-primary/30 shadow-sm",
  accessibility: "bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-500 dark:border-amber-500 text-amber-900 dark:text-amber-200 font-bold shadow-xs hover:brightness-95 cursor-pointer",
  blocked: "bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-500 dark:text-red-400 cursor-not-allowed",
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
    "clay-seat rounded-lg font-medium transition-all duration-200 flex items-center justify-center relative border";
  const stateClasses = groupAssignment
    ? "bg-ui-primary border border-ui-primary text-white font-bold ring-2 ring-ui-primary/30 shadow-sm"
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

  const isDisabledAvailable = disabled && state === "available";

  return (
    <Component
      type={isInteractive ? "button" : undefined}
      data-state={state}
      className={`${baseClasses} ${stateClasses} ${sizeClasses} ${
        isDisabledAvailable ? "cursor-not-allowed opacity-50" : ""
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
