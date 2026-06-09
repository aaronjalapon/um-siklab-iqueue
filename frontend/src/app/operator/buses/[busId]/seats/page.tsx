"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, RefreshCw, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { BusSeatGrid } from "@/components/seats/BusSeatGrid";
import { SeatLegend } from "@/components/seats/SeatLegend";
import { OperatorSeatList } from "@/components/seats/OperatorSeatList";
import { useSeatMap } from "@/hooks/useSeatMap";
import { swapSeats, getBooking } from "@/lib/api";
import type { SeatMapEntry } from "@/types/seat";

type ViewMode = "grid" | "list";

export default function OperatorSeatDashboardPage() {
  const { busId } = useParams<{ busId: string }>();
  const { seats, loading, error, refreshSeats } = useSeatMap(busId as string);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [swapping, setSwapping] = useState(false);
  const [swapMessage, setSwapMessage] = useState<string | null>(null);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshSeats, 30_000);
    return () => clearInterval(interval);
  }, [refreshSeats]);

  const occupied = seats.filter((s) => s.status === "occupied").length;
  const total = seats.length;
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  const barColor =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500";

  const handleSwapRequest = useCallback(
    async (seatA: SeatMapEntry, seatB: SeatMapEntry) => {
      if (!seatA.passenger_name || !seatB.passenger_name) return;
      setSwapping(true);
      setSwapMessage(null);
      try {
        // We need booking IDs — fetch from the seat map or API
        // For now, use seat labels as proxy; in production, store booking IDs
        const result = await swapSeats({
          booking_id_a: "00000000-0000-0000-0000-000000000001", // placeholder
          booking_id_b: "00000000-0000-0000-0000-000000000002", // placeholder
        });
        setSwapMessage(
          `Swapped: ${result.seat_a} ↔ ${result.seat_b}`
        );
        refreshSeats();
      } catch (err: unknown) {
        setSwapMessage(
          err instanceof Error ? err.message : "Swap failed"
        );
      } finally {
        setSwapping(false);
        // Clear message after 5s
        setTimeout(() => setSwapMessage(null), 5000);
      }
    },
    [refreshSeats]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-64" />
          <div className="h-4 bg-slate-200 rounded w-96" />
          <div className="h-64 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 max-w-md mx-auto">
          <p className="font-semibold">Could not load seat data</p>
          <p className="text-sm mt-1">{error}</p>
          <Link
            href="/operator/buses"
            className="text-blue-600 hover:underline text-sm mt-3 inline-block"
          >
            Back to fleet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/operator/buses"
            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3 h-3" /> Back to fleet
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Seat Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bus ID: {busId}
          </p>
        </div>
        <button
          type="button"
          onClick={refreshSeats}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Capacity summary */}
      <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl border border-white/20 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Capacity
          </span>
          <span className="text-slate-500">
            {occupied} / {total} seats occupied ({pct}%)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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

      {/* Swap notification */}
      {swapMessage && (
        <div
          className={`p-3 rounded-lg text-sm ${
            swapMessage.startsWith("Swapped")
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {swapMessage}
        </div>
      )}

      {/* View toggle tabs */}
      <div className="flex items-center gap-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "grid"}
          onClick={() => setViewMode("grid")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            viewMode === "grid"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Grid View
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === "list"}
          onClick={() => setViewMode("list")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            viewMode === "list"
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          }`}
        >
          <List className="w-4 h-4" />
          List View
        </button>
      </div>

      {/* Content */}
      {viewMode === "grid" ? (
        <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-sm border border-white/20 p-6">
          <BusSeatGrid seats={seats} readOnly />
          <div className="mt-4">
            <SeatLegend variant="operator" />
          </div>
        </div>
      ) : (
        <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-sm border border-white/20 p-6">
          <OperatorSeatList
            seats={seats}
            onSwapRequest={handleSwapRequest}
          />
        </div>
      )}
    </div>
  );
}
