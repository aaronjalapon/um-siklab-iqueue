"use client";

import { useMemo } from "react";
import { SeatCell } from "./SeatCell";
import type { SeatMapEntry, SeatCellState } from "@/types/seat";

interface BusSeatGridProps {
  seats: SeatMapEntry[];
  autoAssignedSeatId?: string;
  selectedSeatId?: string;
  onSeatSelect?: (seat: SeatMapEntry) => void;
  groupId?: string;
  readOnly?: boolean;
}

export function BusSeatGrid({
  seats,
  autoAssignedSeatId,
  selectedSeatId,
  onSeatSelect,
  groupId,
  readOnly = false,
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

  return (
    <div className="w-full overflow-x-auto">
      {/* Front of bus indicator */}
      <div className="text-xs text-center text-slate-400 mb-3 tracking-widest uppercase">
        — Front of Bus —
      </div>

      <div className="mx-auto w-max max-w-full space-y-2 px-1">
        {rows.map((rowSeats, ri) => (
          <div
            key={ri}
            className="flex justify-center gap-2"
            style={{ animationDelay: `${ri * 50}ms` }}
          >
            {/* Left side seats */}
            <div className="flex gap-1">
              {rowSeats
                .filter((s) => s.col_number <= aisleAfterCol)
                .map((seat) => (
                  <SeatCell
                    key={seat.seat_id}
                    seat={seat}
                    state={getCellState(seat)}
                    onClick={readOnly ? undefined : onSeatSelect}
                  />
                ))}
            </div>

            {/* Aisle gap */}
            <div className="w-6" aria-hidden />

            {/* Right side seats */}
            <div className="flex gap-1">
              {rowSeats
                .filter((s) => s.col_number > aisleAfterCol)
                .map((seat) => (
                  <SeatCell
                    key={seat.seat_id}
                    seat={seat}
                    state={getCellState(seat)}
                    onClick={readOnly ? undefined : onSeatSelect}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Back of bus indicator */}
      <div className="text-xs text-center text-slate-400 mt-4 tracking-widest uppercase">
        — Back of Bus —
      </div>
    </div>
  );
}
