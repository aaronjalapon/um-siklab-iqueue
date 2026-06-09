"use client";

import { useMemo, useState } from "react";
import { DataStatusBanner } from "@/components/operator/DataStatusBanner";
import { EmptyState } from "@/components/operator/EmptyState";
import { FleetBusCard } from "@/components/operator/FleetBusCard";
import { LoadingSkeleton } from "@/components/operator/LoadingSkeleton";
import {
  DEMO_ROUTES,
  todayIsoDate,
  useOperatorFleet,
} from "@/hooks/useOperatorFleet";
import { glassStyles } from "@/lib/design-system";

export default function OperatorBusesPage() {
  const [routeIndex, setRouteIndex] = useState(0);
  const [travelDate, setTravelDate] = useState(todayIsoDate);

  const route = DEMO_ROUTES[routeIndex];

  const { buses, loadState, refetch, loadDemo } = useOperatorFleet({
    origin: route.origin,
    destination: route.destination,
    travelDate,
  });

  const sortedBuses = useMemo(() => {
    return [...buses].sort((a, b) => {
      const pctA = (a.capacity - a.available_seats) / a.capacity;
      const pctB = (b.capacity - b.available_seats) / b.capacity;
      return pctB - pctA;
    });
  }, [buses]);

  return (
    <div className={glassStyles.pageContainer}>
      <header>
        <h1 className="text-2xl font-bold text-foreground">Fleet Overview</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Capacity and surge by bus
        </p>
      </header>

      {loadState === "demo" && (
        <DataStatusBanner message="Showing demo data. Real API data is unavailable — connect the backend to see live metrics." />
      )}
      {loadState === "error" && (
        <DataStatusBanner message="Could not reach the backend. Check that the API server is running." />
      )}

      <div className="flex flex-col sm:flex-row flex-wrap gap-4">
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
            className={`${glassStyles.input} text-sm max-w-xs`}
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
            className={`${glassStyles.input} text-sm max-w-xs`}
          />
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
