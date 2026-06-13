"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Bus, TrendingUp, Users } from "lucide-react";
import { BusCapacityList } from "@/components/operator/BusCapacityList";
import { DataStatusBanner } from "@/components/operator/DataStatusBanner";
import { StatCard } from "@/components/operator/StatCard";
import { SurgeForecastChart } from "@/components/operator/SurgeForecastChart";
import { PageHeader } from "@/components/ui/PageHeader";
import { useForecast } from "@/hooks/useForecast";
import { useOperatorFleet, todayIsoDate } from "@/hooks/useOperatorFleet";
import { glassStyles } from "@/lib/design-system";
import {
  DEMO_ROUTES,
  MOCK_BUS_CAPACITY,
  OPERATOR_STATS,
} from "@/lib/operator-mock";
import type { BusCapacityEntry } from "@/lib/operator-mock";

export default function OperatorDashboard() {
  const [routeId, setRouteId] = useState(DEMO_ROUTES[0].id);
  const selectedRoute =
    DEMO_ROUTES.find((r) => r.id === routeId) ?? DEMO_ROUTES[0];

  const { predictions, routeOrigin, routeDestination, loadState, refetch } =
    useForecast(routeId);

  // Fetch real fleet data for the selected route
  const {
    buses: fleetBuses,
    loadState: fleetLoadState,
  } = useOperatorFleet({
    origin: selectedRoute.origin,
    destination: selectedRoute.destination,
    travelDate: todayIsoDate(),
  });

  const routeLabel =
    routeOrigin && routeDestination
      ? `${routeOrigin} → ${routeDestination}`
      : selectedRoute.label;

  // Compute stats from real fleet data (fall back to mock in demo mode)
  const stats = useMemo(() => {
    if (fleetLoadState === "success" && fleetBuses.length > 0) {
      const totalBooked = fleetBuses.reduce(
        (sum, b) => sum + (b.capacity - b.available_seats), 0
      );
      return {
        activeBuses: fleetBuses.length,
        todaysBookings: totalBooked,
      };
    }
    // Fall back to mock stats in demo/error/empty states
    return {
      activeBuses: OPERATOR_STATS.activeBuses,
      todaysBookings: OPERATOR_STATS.todaysBookings,
    };
  }, [fleetBuses, fleetLoadState]);

  // Build bus capacity entries from real fleet data
  const capacityEntries: BusCapacityEntry[] = useMemo(() => {
    if (fleetLoadState === "success" && fleetBuses.length > 0) {
      return fleetBuses.map((b) => ({
        plate: b.plate_number,
        capacity: b.capacity,
        booked: b.capacity - b.available_seats,
        route: `${b.origin} → ${b.destination}`,
      }));
    }
    // Fall back to mock in demo/error states
    return MOCK_BUS_CAPACITY;
  }, [fleetBuses, fleetLoadState]);

  const avgSurge = useMemo(() => {
    if (predictions.length === 0) return "0%";
    const avg =
      predictions.reduce((a, p) => a + p.surge_probability, 0) /
      predictions.length;
    return `${(avg * 100).toFixed(0)}%`;
  }, [predictions]);

  const highSurgeDays = useMemo(
    () => predictions.filter((p) => p.surge_probability >= 0.7).length,
    [predictions]
  );

  const isForecastLoading = loadState === "loading";
  const isFleetLoading = fleetLoadState === "loading";
  const showDemoBanner =
    loadState === "demo" || loadState === "error" ||
    fleetLoadState === "demo" || fleetLoadState === "error";

  return (
    <div className={glassStyles.pageContainer}>
      <PageHeader
        eyebrow="Operator control room"
        title="Operator Dashboard"
        description={`Route: ${routeLabel}`}
        actions={
          <label className="flex w-full flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300 sm:min-w-[260px] sm:w-auto">
            Forecast route
            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className={`${glassStyles.input} text-sm`}
            >
              {DEMO_ROUTES.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.label}
                </option>
              ))}
            </select>
          </label>
        }
      />

      {showDemoBanner && (
        <DataStatusBanner
          message={
            loadState === "error" || fleetLoadState === "error"
              ? "Could not reach the backend. Showing cached data where available."
              : "Showing demo data — connect the backend to see live metrics."
          }
        />
      )}

      {isForecastLoading || isFleetLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`${glassStyles.statCard} animate-pulse motion-reduce:animate-none`}>
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={Bus}
            label="Active Buses"
            value={String(stats.activeBuses)}
            iconClassName="text-brand-blue"
          />
          <StatCard
            icon={Users}
            label="Today's Bookings"
            value={stats.todaysBookings.toLocaleString()}
            iconClassName="text-green-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg Surge Probability"
            value={avgSurge}
            iconClassName="text-amber-500"
          />
          <StatCard
            icon={AlertTriangle}
            label="High Surge Days"
            value={String(highSurgeDays)}
            iconClassName="text-red-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4 xl:gap-6">
        <SurgeForecastChart
          predictions={predictions}
          loading={isForecastLoading}
          onRetry={refetch}
        />
        <BusCapacityList buses={capacityEntries} />
      </div>
    </div>
  );
}
