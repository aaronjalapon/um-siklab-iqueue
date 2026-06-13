"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { BusSeatGrid } from "@/components/seats/BusSeatGrid";
import { SeatLegend } from "@/components/seats/SeatLegend";
import { OperatorSeatList } from "@/components/seats/OperatorSeatList";
import { CapacityMeter } from "@/components/ui/CapacityMeter";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSeatMap } from "@/hooks/useSeatMap";
import { glassStyles } from "@/lib/design-system";

type ViewMode = "grid" | "list";

export default function OperatorSeatDashboardPage() {
  const { busId } = useParams<{ busId: string }>();
  const { seats, loading, error, refreshSeats } = useSeatMap(busId as string);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshSeats, 30_000);
    return () => clearInterval(interval);
  }, [refreshSeats]);

  const occupied = seats.filter((s) => s.status === "occupied").length;
  const total = seats.length;

  if (loading) {
    return (
      <div className={glassStyles.pageContainer}>
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
    <div className={glassStyles.pageContainer}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/operator/buses"
            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3 h-3" /> Back to fleet
          </Link>
          <PageHeader
            eyebrow="Seat operations"
            title="Seat Management"
            description={`Bus ID: ${busId}`}
          />
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
      <div className={`${glassStyles.panel} p-4`}>
        <CapacityMeter booked={occupied} capacity={total} label="Seats occupied" />
      </div>

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
        <div className={`${glassStyles.panel} p-6`}>
          <BusSeatGrid seats={seats} readOnly />
          <div className="mt-4">
            <SeatLegend variant="operator" />
          </div>
        </div>
      ) : (
        <div className={`${glassStyles.panel} p-6`}>
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            Seat swap is disabled in this prototype until the seat map includes
            real booking IDs for each occupied seat.
          </div>
          <OperatorSeatList seats={seats} />
        </div>
      )}
    </div>
  );
}
