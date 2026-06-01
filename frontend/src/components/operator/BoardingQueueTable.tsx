"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, CheckCircle2 } from "lucide-react";
import { glassStyles } from "@/lib/design-system";
import type { BoardingQueueEntry } from "@/lib/operator-mock";
import { formatBoardingWindow, statusColorClass } from "@/lib/utils";
import { EmptyState } from "./EmptyState";

export type QueueFilter = "all" | "boarding_now" | "upcoming" | "missed";

function isBoardingNow(entry: BoardingQueueEntry): boolean {
  const now = Date.now();
  const start = new Date(entry.boardingWindowStart).getTime();
  const end = new Date(entry.boardingWindowEnd).getTime();
  return now >= start && now <= end && entry.status !== "boarded" && entry.status !== "missed";
}

function matchesFilter(entry: BoardingQueueEntry, filter: QueueFilter): boolean {
  if (filter === "all") return true;
  if (filter === "missed") return entry.status === "missed";
  if (filter === "boarding_now") return isBoardingNow(entry);
  if (filter === "upcoming") {
    return (
      entry.status !== "boarded" &&
      entry.status !== "missed" &&
      new Date(entry.boardingWindowStart).getTime() > Date.now()
    );
  }
  return true;
}

interface BoardingQueueTableProps {
  entries: BoardingQueueEntry[];
  onMarkBoarded: (bookingId: string) => void;
}

type SortKey = "window" | "name" | "seat";

export function BoardingQueueTable({
  entries,
  onMarkBoarded,
}: BoardingQueueTableProps) {
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("window");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = entries.filter((e) => matchesFilter(e, filter));
    if (q) {
      list = list.filter(
        (e) =>
          e.passengerName.toLowerCase().includes(q) ||
          e.seatNumber.toLowerCase().includes(q) ||
          e.busPlate.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "window") {
        cmp =
          new Date(a.boardingWindowStart).getTime() -
          new Date(b.boardingWindowStart).getTime();
      } else if (sortKey === "name") {
        cmp = a.passengerName.localeCompare(b.passengerName);
      } else {
        cmp = a.seatNumber.localeCompare(b.seatNumber);
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [entries, filter, search, sortKey, sortAsc]);

  const summary = useMemo(() => {
    const waiting = entries.filter(
      (e) => e.status !== "boarded" && e.status !== "missed"
    ).length;
    const boardingNow = entries.filter((e) => isBoardingNow(e)).length;
    const missed = entries.filter((e) => e.status === "missed").length;
    return { waiting, boardingNow, missed };
  }, [entries]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function sortAria(key: SortKey): "ascending" | "descending" | "none" {
    if (sortKey !== key) return "none";
    return sortAsc ? "ascending" : "descending";
  }

  const filters: { id: QueueFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "boarding_now", label: "Boarding now" },
    { id: "upcoming", label: "Upcoming" },
    { id: "missed", label: "Missed" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-300">
        <span className={`${glassStyles.badge} bg-slate-100 dark:bg-slate-800`}>
          {summary.waiting} waiting
        </span>
        <span className={`${glassStyles.badge} bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200`}>
          {summary.boardingNow} boarding now
        </span>
        <span className={`${glassStyles.badge} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200`}>
          {summary.missed} missed
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div
          className={glassStyles.segmentedControl}
          role="tablist"
          aria-label="Queue filters"
        >
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={
                filter === f.id
                  ? glassStyles.segmentedActive
                  : glassStyles.segmentedInactive
              }
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search name, seat, or plate…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${glassStyles.input} text-sm w-full lg:max-w-xs`}
          aria-label="Search queue"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No passengers match"
          description="Try a different filter or search term."
        />
      ) : (
        <div className={`${glassStyles.panel} overflow-x-auto`}>
          <table className="w-full text-sm">
            <caption className="sr-only">
              Boarding queue — passengers sorted by boarding window
            </caption>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500 dark:text-slate-400">
                <th className="p-3 font-medium" aria-sort={sortAria("name")}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("name")}
                  >
                    Passenger <ArrowUpDown className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </th>
                <th className="p-3 font-medium hidden sm:table-cell">Bus</th>
                <th className="p-3 font-medium" aria-sort={sortAria("seat")}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("seat")}
                  >
                    Seat <ArrowUpDown className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </th>
                <th className="p-3 font-medium" aria-sort={sortAria("window")}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("window")}
                  >
                    Window <ArrowUpDown className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const boarding = isBoardingNow(entry);
                return (
                  <tr
                    key={entry.bookingId}
                    className={`border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                      boarding
                        ? "border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
                        : ""
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-medium text-foreground">
                        {entry.passengerName}
                      </div>
                      <div className="text-xs text-slate-500 sm:hidden">
                        {entry.busPlate}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs hidden sm:table-cell">
                      {entry.busPlate}
                    </td>
                    <td className="p-3 font-mono">{entry.seatNumber}</td>
                    <td className="p-3 text-xs whitespace-nowrap">
                      {formatBoardingWindow(
                        entry.boardingWindowStart,
                        entry.boardingWindowEnd
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`${glassStyles.badge} ${statusColorClass(entry.status)}`}
                      >
                        <span className="sr-only">Status: </span>
                        {entry.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {entry.status !== "boarded" && entry.status !== "missed" ? (
                        <button
                          type="button"
                          onClick={() => onMarkBoarded(entry.bookingId)}
                          className={`${glassStyles.primaryButton} inline-flex items-center gap-1 text-xs py-1.5 px-3`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
                          Board
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
