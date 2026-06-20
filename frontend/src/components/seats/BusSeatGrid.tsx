"use client";

import { useMemo } from "react";
import { Accessibility, BusFront } from "lucide-react";
import { SeatCell } from "./SeatCell";
import type { SeatMapEntry, SeatCellState } from "@/types/seat";

interface BusSeatGridProps {
  seats: SeatMapEntry[];
  autoAssignedSeatId?: string;
  selectedSeatId?: string;
  onSeatSelect?: (seat: SeatMapEntry) => void;
  groupId?: string;
  readOnly?: boolean;
  needsAccessibility?: boolean;
}

export function BusSeatGrid({
  seats,
  autoAssignedSeatId,
  selectedSeatId,
  onSeatSelect,
  groupId,
  readOnly = false,
  needsAccessibility = false,
}: BusSeatGridProps) {
  // Group seats by row
  const rows = useMemo(() => {
    if (seats.length === 0) return [];
    const grouped: Record<number, SeatMapEntry[]> = {};
    for (const seat of seats) {
      if (!grouped[seat.row_number]) {
        grouped[seat.row_number] = [];
      }
      grouped[seat.row_number].push(seat);
    }
    // Sort by row number
    return Object.entries(grouped)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, rowSeats]) =>
        rowSeats.sort((a, b) => a.col_number - b.col_number)
      );
  }, [seats]);

  function getCellState(seat: SeatMapEntry): SeatCellState {
    if (seat.status === "blocked") return "blocked";
    if (seat.seat_id === selectedSeatId) return "selected";
    if (seat.seat_id === autoAssignedSeatId) return "auto_assigned";
    if (seat.status === "occupied" || seat.status === "reserved") {
      if (groupId && seat.group_id === groupId) return "group_reserved";
      return "occupied";
    }
    if (seat.is_accessibility) return "accessibility";
    return "available";
  }

  if (seats.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        No seat data available
      </div>
    );
  }

  const seatsPerRow = rows[0]?.length || 4;
  const aisleAfterCol = Math.ceil(seatsPerRow / 2);
  const accessibilityCount = seats.filter((seat) => seat.is_accessibility).length;

  return (
    <div className="w-full overflow-x-auto">
      <div className="relative mx-auto w-max max-w-full px-3 pb-8 pt-2">
        <div
          className="absolute left-6 right-6 top-5 h-10 rounded-t-[2rem] border border-slate-300 bg-slate-800 shadow-inner dark:border-slate-700 dark:bg-slate-950"
          aria-hidden
        />
        <div
          className="absolute bottom-5 left-2 h-10 w-3 rounded-full bg-slate-800 dark:bg-slate-950"
          aria-hidden
        />
        <div
          className="absolute bottom-5 right-2 h-10 w-3 rounded-full bg-slate-800 dark:bg-slate-950"
          aria-hidden
        />

        <div className="relative rounded-[2rem] border-2 border-slate-300 bg-slate-50 px-4 pb-6 pt-5 shadow-inner dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between gap-3 rounded-t-[1.35rem] border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <BusFront className="h-4 w-4 text-brand-blue" aria-hidden />
              Front
            </span>
            {accessibilityCount > 0 && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 ${
                  needsAccessibility
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Accessibility className="h-3.5 w-3.5" aria-hidden />
                {accessibilityCount} priority
              </span>
            )}
          </div>

          <div className="absolute right-0 top-20 h-14 w-2 rounded-l-lg bg-brand-orange/70" aria-hidden />

          <div className="mx-auto w-max max-w-full space-y-2 px-1">
            {rows.map((rowSeats, ri) => (
              <div
                key={ri}
                className="grid grid-cols-[auto_1.75rem_auto] items-center justify-center gap-2"
                style={{ animationDelay: `${ri * 50}ms` }}
              >
                <div className="flex gap-1">
                  {rowSeats
                    .filter((s) => s.col_number <= aisleAfterCol)
                    .map((seat) => (
                      <SeatCell
                        key={seat.seat_id}
                        seat={seat}
                        state={getCellState(seat)}
                        onClick={readOnly ? undefined : onSeatSelect}
                        disabled={needsAccessibility && !seat.is_accessibility}
                      />
                    ))}
                </div>

                <div className="h-9 rounded-full border border-dashed border-slate-300 bg-white/50 dark:border-slate-700 dark:bg-slate-950/40" aria-hidden />

                <div className="flex gap-1">
                  {rowSeats
                    .filter((s) => s.col_number > aisleAfterCol)
                    .map((seat) => (
                      <SeatCell
                        key={seat.seat_id}
                        seat={seat}
                        state={getCellState(seat)}
                        onClick={readOnly ? undefined : onSeatSelect}
                        disabled={needsAccessibility && !seat.is_accessibility}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-b-[1.35rem] border border-slate-200 bg-white/70 py-2 text-center text-xs font-semibold uppercase tracking-widest text-slate-400 dark:border-slate-700 dark:bg-slate-950/60">
            Back
          </div>
        </div>
      </div>
    </div>
  );
}
