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
    "bg-ui-surface border-ui-border text-ui-foreground hover:bg-ui-muted hover:border-ui-primary cursor-pointer",
  occupied:
    "bg-ui-muted border-ui-border text-ui-muted-foreground font-medium cursor-not-allowed",
  selected: "bg-ui-primary border-ui-primary text-white dark:text-ui-navy font-bold ring-2 ring-ui-primary/30",
  auto_assigned:
    "seat-recommended bg-ui-primary border-ui-primary text-white dark:text-ui-navy font-bold ring-2 ring-ui-primary/30 ring-offset-1",
  group_reserved: "bg-ui-primary border-ui-primary text-white dark:text-ui-navy font-bold ring-2 ring-ui-primary/30",
  accessibility: "bg-ui-warning-surface border-ui-warning text-ui-warning cursor-pointer hover:brightness-95",
  blocked: "bg-ui-danger-surface border-ui-danger/40 text-ui-danger/55 cursor-not-allowed",
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
    ? groupAssignment.is_accessibility
      ? "bg-ui-warning-surface border-ui-warning text-ui-warning font-bold ring-2 ring-ui-warning/30"
      : "bg-ui-primary border-ui-primary text-white dark:text-ui-navy font-bold ring-2 ring-ui-primary/30"
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
      data-state={state}
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
