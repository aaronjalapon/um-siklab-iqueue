"use client";

import { useMemo, useState } from "react";
import { ListFilter } from "lucide-react";
import { DataStatusBanner } from "@/components/operator/DataStatusBanner";
import { EmptyState } from "@/components/operator/EmptyState";
import { FleetBusCard } from "@/components/operator/FleetBusCard";
import { LoadingSkeleton } from "@/components/operator/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  DEMO_ROUTES,
  todayIsoDate,
  useOperatorFleet,
} from "@/hooks/useOperatorFleet";
import { glassStyles } from "@/lib/design-system";

export default function OperatorBusesPage() {
  const [routeIndex, setRouteIndex] = useState(0);
  const [travelDate, setTravelDate] = useState(todayIsoDate);
  const [sortMode, setSortMode] = useState<"occupancy" | "available" | "plate">(
    "occupancy"
  );

  const route = DEMO_ROUTES[routeIndex];

  const { buses, loadState, refetch, loadDemo } = useOperatorFleet({
    origin: route.origin,
    destination: route.destination,
    travelDate,
  });

  const sortedBuses = useMemo(() => {
    return [...buses].sort((a, b) => {
      if (sortMode === "available") return b.available_seats - a.available_seats;
      if (sortMode === "plate") return a.plate_number.localeCompare(b.plate_number);
      const pctA = (a.capacity - a.available_seats) / a.capacity;
      const pctB = (b.capacity - b.available_seats) / b.capacity;
      return pctB - pctA;
    });
  }, [buses, sortMode]);

  return (
    <div className={glassStyles.pageContainer}>
      <PageHeader
        eyebrow="Fleet operations"
        title="Fleet Overview"
        description="Capacity, availability, and surge status by bus."
      />

      {loadState === "demo" && (
        <DataStatusBanner message="Showing demo data. Real API data is unavailable — connect the backend to see live metrics." />
      )}
      {loadState === "error" && (
        <DataStatusBanner message="Could not reach the backend. Check that the API server is running." />
      )}

      <div className={`${glassStyles.panel} grid grid-cols-1 gap-4 p-4 md:grid-cols-3`}>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="fleet-route"
            className="text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            Route
          </label>
          <select
            id="fleet-route"
            value={routeIndex}
            onChange={(e) => setRouteIndex(Number(e.target.value))}
            className={`${glassStyles.input} w-full text-sm`}
          >
            {DEMO_ROUTES.map((r, i) => (
              <option key={r.id} value={i}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="fleet-date"
            className="text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            Travel date
          </label>
          <input
            id="fleet-date"
            type="date"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            className={`${glassStyles.input} w-full text-sm`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="fleet-sort"
            className="text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            Sort
          </label>
          <div className="relative">
            <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              id="fleet-sort"
              value={sortMode}
              onChange={(e) =>
                setSortMode(e.target.value as "occupancy" | "available" | "plate")
              }
              className={`${glassStyles.input} w-full pl-9 text-sm`}
            >
              <option value="occupancy">Highest occupancy</option>
              <option value="available">Most available seats</option>
              <option value="plate">Plate number</option>
            </select>
          </div>
        </div>
      </div>

      {loadState === "loading" && <LoadingSkeleton variant="grid" rows={6} />}

      {loadState !== "loading" && sortedBuses.length === 0 && (
        <EmptyState
          title={
            loadState === "error"
              ? "Connection Error"
              : loadState === "empty"
                ? "No Buses Found"
                : "No Data Available"
          }
          description={
            loadState === "error"
              ? "Could not reach the backend API. Check that the server is running."
              : loadState === "empty"
                ? "No fleet data for this route and date."
                : "No data is currently available."
          }
          actionLabel="Retry"
          onAction={refetch}
        />
      )}

      {(loadState === "empty" || loadState === "error") && (
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={loadDemo}
            className="text-sm text-slate-400 hover:text-slate-600 underline"
          >
            Or load demo data instead
          </button>
        </div>
      )}

      {loadState !== "loading" && sortedBuses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedBuses.map((bus) => (
            <FleetBusCard key={bus.id} bus={bus} />
          ))}
        </div>
      )}
    </div>
  );
}
