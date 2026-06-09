"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowRightLeft } from "lucide-react";
import type { SeatMapEntry } from "@/types/seat";

interface OperatorSeatListProps {
  seats: SeatMapEntry[];
  onSwapRequest?: (seatA: SeatMapEntry, seatB: SeatMapEntry) => void;
}

type SortKey = "seat" | "status" | "affinity" | "passenger";

const LANGUAGE_LABELS: Record<string, string> = {
  fil: "Filipino",
  en: "English",
  id: "Bahasa",
  vi: "Vietnamese",
};

export function OperatorSeatList({
  seats,
  onSwapRequest,
}: OperatorSeatListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("seat");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const list = [...seats];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "seat":
          cmp = a.row_number - b.row_number || a.col_number - b.col_number;
          break;
        case "status":
          cmp = (a.status || "").localeCompare(b.status || "");
          break;
        case "affinity":
          cmp = (a.affinity_score ?? 0) - (b.affinity_score ?? 0);
          break;
        case "passenger":
          cmp = (a.passenger_name || "").localeCompare(b.passenger_name || "");
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [seats, sortKey, sortAsc]);

  const occupied = seats.filter((s) => s.status === "occupied").length;
  const total = seats.length;
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function handleCheckbox(seatId: string) {
    if (selectedA === seatId) {
      setSelectedA(null);
    } else if (selectedB === seatId) {
      setSelectedB(null);
    } else if (!selectedA) {
      setSelectedA(seatId);
    } else if (!selectedB) {
      setSelectedB(seatId);
    }
  }

  function handleSwap() {
    if (!selectedA || !selectedB || !onSwapRequest) return;
    const seatA = seats.find((s) => s.seat_id === selectedA);
    const seatB = seats.find((s) => s.seat_id === selectedB);
    if (seatA && seatB) {
      onSwapRequest(seatA, seatB);
      setSelectedA(null);
      setSelectedB(null);
    }
  }

  const barColor =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500";

  function sortAria(key: SortKey): "ascending" | "descending" | "none" {
    if (sortKey !== key) return "none";
    return sortAsc ? "ascending" : "descending";
  }

  return (
    <div className="space-y-4">
      {/* Capacity progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Capacity
          </span>
          <span className="text-slate-500">
            {occupied} / {total} seats ({pct}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500`}
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${pct}% capacity`}
          />
        </div>
      </div>

      {/* Swap controls */}
      {onSwapRequest && (selectedA || selectedB) && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">
            {selectedA ? "1 selected" : ""}
            {selectedA && selectedB ? " · 2 selected" : ""}
          </span>
          {selectedA && selectedB && (
            <button
              type="button"
              onClick={handleSwap}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Swap Seats
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <caption className="sr-only">Seat assignments — sortable list</caption>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500 dark:text-slate-400">
              {onSwapRequest && (
                <th className="p-3 w-8">
                  <span className="sr-only">Select</span>
                </th>
              )}
              <th className="p-3 font-medium" aria-sort={sortAria("seat")}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("seat")}
                >
                  Seat <ArrowUpDown className="w-3.5 h-3.5" aria-hidden />
                </button>
              </th>
              <th className="p-3 font-medium" aria-sort={sortAria("status")}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("status")}
                >
                  Status <ArrowUpDown className="w-3.5 h-3.5" aria-hidden />
                </button>
              </th>
              <th className="p-3 font-medium" aria-sort={sortAria("passenger")}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("passenger")}
                >
                  Passenger <ArrowUpDown className="w-3.5 h-3.5" aria-hidden />
                </button>
              </th>
              <th className="p-3 font-medium hidden md:table-cell">Language</th>
              <th className="p-3 font-medium hidden md:table-cell">
                Travel Habit
              </th>
              <th className="p-3 font-medium" aria-sort={sortAria("affinity")}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("affinity")}
                >
                  Affinity <ArrowUpDown className="w-3.5 h-3.5" aria-hidden />
                </button>
              </th>
              <th className="p-3 font-medium hidden lg:table-cell">
                Boarding Window
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((seat) => {
              const isSwapSelected =
                seat.seat_id === selectedA || seat.seat_id === selectedB;
              return (
                <tr
                  key={seat.seat_id}
                  className={`border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                    isSwapSelected
                      ? "bg-blue-50 dark:bg-blue-950/30"
                      : seat.status === "occupied"
                        ? ""
                        : "text-slate-400"
                  }`}
                >
                  {onSwapRequest && (
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSwapSelected}
                        onChange={() => handleCheckbox(seat.seat_id)}
                        disabled={seat.status !== "occupied"}
                        className="rounded"
                        aria-label={`Select seat ${seat.seat_label} for swap`}
                      />
                    </td>
                  )}
                  <td className="p-3 font-mono font-medium">{seat.seat_label}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        seat.status === "available"
                          ? "bg-green-100 text-green-800"
                          : seat.status === "occupied"
                            ? "bg-blue-100 text-blue-800"
                            : seat.status === "blocked"
                              ? "bg-red-100 text-red-800"
                              : "bg-violet-100 text-violet-800"
                      }`}
                    >
                      {seat.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {seat.passenger_name || (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="p-3 hidden md:table-cell text-xs">
                    {seat.language_preference
                      ? LANGUAGE_LABELS[seat.language_preference] ||
                        seat.language_preference
                      : "—"}
                  </td>
                  <td className="p-3 hidden md:table-cell text-xs capitalize">
                    {seat.travel_habit || "—"}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {seat.affinity_score != null
                      ? seat.affinity_score.toFixed(1)
                      : "—"}
                  </td>
                  <td className="p-3 hidden lg:table-cell text-xs">
                    {seat.boarding_window || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
