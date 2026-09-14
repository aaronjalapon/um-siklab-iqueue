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
  groupAssignments?: Array<{
    member_index: number;
    member_name: string;
    seat_label: string;
    is_accessibility: boolean;
  }>;
}

export function BusSeatGrid({
  seats,
  autoAssignedSeatId,
  selectedSeatId,
  onSeatSelect,
  groupId,
  readOnly = false,
  needsAccessibility = false,
  groupAssignments = [],
}: BusSeatGridProps) {
  const assignmentsBySeat = useMemo(
    () => new Map(groupAssignments.map((assignment) => [assignment.seat_label, assignment])),
    [groupAssignments]
  );
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
    // Check occupied/reserved BEFORE selection state so a stale selectedSeatId
    // never renders a taken seat as clickable.
    if (seat.status === "occupied" || seat.status === "reserved") {
      if (groupId && seat.group_id === groupId) return "group_reserved";
      return "occupied";
    }
    if (assignmentsBySeat.has(seat.seat_label)) return "group_reserved";
    if (seat.seat_id === selectedSeatId) return "selected";
    if (seat.seat_id === autoAssignedSeatId) return "auto_assigned";
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
      <div className="relative mx-auto w-max max-w-full px-2 sm:px-3 pb-4 sm:pb-8 pt-1 sm:pt-2">
        <div
          className="absolute left-4 right-4 sm:left-6 sm:right-6 top-3 sm:top-5 h-7 sm:h-10 rounded-t-xl sm:rounded-t-[2rem] border border-slate-300 bg-slate-800 shadow-inner dark:border-slate-700 dark:bg-slate-950"
          aria-hidden
        />
        <div
          className="absolute bottom-3 sm:bottom-5 left-1.5 sm:left-2 h-7 sm:h-10 w-2.5 sm:w-3 rounded-full bg-slate-800 dark:bg-slate-950"
          aria-hidden
        />
        <div
          className="absolute bottom-3 sm:bottom-5 right-1.5 sm:right-2 h-7 sm:h-10 w-2.5 sm:w-3 rounded-full bg-slate-800 dark:bg-slate-950"
          aria-hidden
        />

        <div className="relative rounded-2xl sm:rounded-[2rem] border sm:border-2 border-slate-300 bg-slate-50 px-2.5 py-3 sm:px-4 sm:pb-6 sm:pt-5 shadow-inner dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 sm:mb-5 flex items-center justify-between gap-2 sm:gap-3 rounded-t-xl sm:rounded-t-[1.35rem] border border-slate-200 bg-white/80 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <BusFront className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-blue" aria-hidden />
              Front
            </span>
            {accessibilityCount > 0 && (
              <span
                className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-1.5 py-0.5 sm:px-2 sm:py-1 ${
                  needsAccessibility
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Accessibility className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                {accessibilityCount} priority
              </span>
            )}
          </div>

          <div className="absolute right-0 top-14 sm:top-20 h-10 sm:h-14 w-1.5 sm:w-2 rounded-l-lg bg-brand-orange/70" aria-hidden />

          <div className="mx-auto w-max max-w-full space-y-1.5 sm:space-y-2 px-0.5 sm:px-1">
            {rows.map((rowSeats, ri) => {
              const isFiveSeatRow = rowSeats.length >= 5;
              const leftSeats = isFiveSeatRow
                ? rowSeats.filter((s) => s.col_number <= 2)
                : rowSeats.filter((s) => s.col_number <= aisleAfterCol);
              const centerSeat = isFiveSeatRow
                ? rowSeats.find((s) => s.col_number === 3) || rowSeats[2]
                : undefined;
              const rightSeats = isFiveSeatRow
                ? rowSeats.filter((s) => s.col_number >= 4)
                : rowSeats.filter((s) => s.col_number > aisleAfterCol);

              return (
                <div
                  key={ri}
                  className="grid grid-cols-[auto_2rem_auto] sm:grid-cols-[auto_2.5rem_auto] items-center justify-center gap-1.5 sm:gap-2"
                  style={{ animationDelay: `${ri * 50}ms` }}
                >
                  <div className="flex gap-1">
                    {leftSeats.map((seat) => (
                      <SeatCell
                        key={seat.seat_id}
                        seat={seat}
                        state={getCellState(seat)}
                        onClick={readOnly ? undefined : onSeatSelect}
                        disabled={needsAccessibility && !seat.is_accessibility}
                        groupAssignment={assignmentsBySeat.get(seat.seat_label)}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-center w-8 sm:w-10">
                    {centerSeat ? (
                      <SeatCell
                        key={centerSeat.seat_id}
                        seat={centerSeat}
                        state={getCellState(centerSeat)}
                        onClick={readOnly ? undefined : onSeatSelect}
                        disabled={needsAccessibility && !centerSeat.is_accessibility}
                        groupAssignment={assignmentsBySeat.get(centerSeat.seat_label)}
                      />
                    ) : (
                      <div
                        className="h-8 sm:h-9 w-5 sm:w-6 rounded-full border border-dashed border-slate-300 bg-white/50 dark:border-slate-700 dark:bg-slate-950/40"
                        aria-hidden
                      />
                    )}
                  </div>

                  <div className="flex gap-1">
                    {rightSeats.map((seat) => (
                      <SeatCell
                        key={seat.seat_id}
                        seat={seat}
                        state={getCellState(seat)}
                        onClick={readOnly ? undefined : onSeatSelect}
                        disabled={needsAccessibility && !seat.is_accessibility}
                        groupAssignment={assignmentsBySeat.get(seat.seat_label)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 sm:mt-5 rounded-b-xl sm:rounded-b-[1.35rem] border border-slate-200 bg-white/70 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-slate-400 dark:border-slate-700 dark:bg-slate-950/60">
            Back
          </div>
        </div>
      </div>
    </div>
  );
}
