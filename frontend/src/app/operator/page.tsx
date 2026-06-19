"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, Bus, Check, Pencil, TrendingUp, Users, X } from "lucide-react";
import { BusCapacityList } from "@/components/operator/BusCapacityList";
import { DataStatusBanner } from "@/components/operator/DataStatusBanner";
import { StatCard } from "@/components/operator/StatCard";
import { SurgeForecastChart } from "@/components/operator/SurgeForecastChart";
import { PageHeader } from "@/components/ui/PageHeader";
import { useForecast } from "@/hooks/useForecast";
import { useOperatorFleet, todayIsoDate } from "@/hooks/useOperatorFleet";
import { getLearningLogSummary, recordForecastAction } from "@/lib/api";
import { glassStyles } from "@/lib/design-system";
import {
  DEMO_ROUTES,
  MOCK_BUS_CAPACITY,
  OPERATOR_STATS,
} from "@/lib/operator-mock";
import type { BusCapacityEntry } from "@/lib/operator-mock";
import type { LearningLogSummary, SurgePrediction } from "@/lib/types";

const DEMO_TENANT_ID = "393bdde0-dde3-5955-bd01-8009b614a2b4";

export default function OperatorDashboard() {
  const [routeId, setRouteId] = useState(DEMO_ROUTES[0].id);
  const [learningSummary, setLearningSummary] =
    useState<LearningLogSummary | null>(null);
  const [actionState, setActionState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [overrideMode, setOverrideMode] = useState<
    "modified" | "rejected" | null
  >(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [finalAction, setFinalAction] = useState("");
  const selectedRoute =
    DEMO_ROUTES.find((r) => r.id === routeId) ?? DEMO_ROUTES[0];

  const {
    predictions,
    routeOrigin,
    routeDestination,
    modelSource,
    modelVersion,
    metricsSummary,
    loadState,
    refetch,
  } = useForecast(routeId);

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
  const primaryPrediction = predictions[0] ?? null;

  const isForecastLoading = loadState === "loading";
  const isFleetLoading = fleetLoadState === "loading";
  const showDemoBanner =
    loadState === "demo" || loadState === "error" ||
    fleetLoadState === "demo" || fleetLoadState === "error";

  useEffect(() => {
    let cancelled = false;

    async function loadLearningSummary() {
      try {
        const summary = await getLearningLogSummary(DEMO_TENANT_ID, routeId);
        if (!cancelled) setLearningSummary(summary);
      } catch {
        if (!cancelled) setLearningSummary(null);
      }
    }

    void loadLearningSummary();
    return () => {
      cancelled = true;
    };
  }, [routeId, actionState]);

  async function submitForecastAction(
    prediction: SurgePrediction,
    action: "accepted" | "modified" | "rejected",
    details?: {
      overrideReason?: string;
      overrideNotes?: string;
      finalAction?: string;
    }
  ) {
    if (!prediction.forecast_snapshot_id) {
      setActionState("error");
      setActionMessage("Demo forecasts cannot be logged as training feedback.");
      return;
    }

    setActionState("saving");
    setActionMessage(null);
    try {
      await recordForecastAction({
        tenant_id: DEMO_TENANT_ID,
        forecast_snapshot_id: prediction.forecast_snapshot_id,
        action_taken: action,
        override_type: action === "accepted" ? undefined : "operator_judgment",
        override_reason: details?.overrideReason,
        notes: details?.overrideNotes,
        operator_id: "demo-admin",
        final_action: details?.finalAction || prediction.recommended_action,
      });
      setActionState("saved");
      setActionMessage("Feedback logged for future model retraining.");
      setOverrideMode(null);
      setOverrideReason("");
      setOverrideNotes("");
      setFinalAction("");
    } catch (err) {
      setActionState("error");
      setActionMessage(err instanceof Error ? err.message : "Could not log feedback.");
    }
  }

  function openOverride(mode: "modified" | "rejected") {
    setOverrideMode(mode);
    setOverrideReason("");
    setOverrideNotes("");
    setFinalAction(primaryPrediction?.recommended_action ?? "");
    setActionMessage(null);
  }

  function submitOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!primaryPrediction || !overrideMode) return;
    if (!overrideReason.trim()) {
      setActionState("error");
      setActionMessage("Reason is required for modified or rejected actions.");
      return;
    }
    void submitForecastAction(primaryPrediction, overrideMode, {
      overrideReason,
      overrideNotes,
      finalAction,
    });
  }

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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 xl:gap-6">
        <section className={`${glassStyles.panel} p-5 xl:col-span-2`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className={glassStyles.sectionTitle}>Forecast Decision</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {primaryPrediction
                  ? primaryPrediction.recommended_action
                  : "No forecast recommendation available."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="rounded border border-slate-200 px-2 py-1 dark:border-slate-700">
                  Source: {modelSource ?? "unknown"}
                </span>
                <span className="rounded border border-slate-200 px-2 py-1 dark:border-slate-700">
                  Version: {modelVersion ?? "n/a"}
                </span>
                {primaryPrediction && (
                  <span className="rounded border border-slate-200 px-2 py-1 capitalize dark:border-slate-700">
                    Risk: {primaryPrediction.risk_level}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!primaryPrediction || actionState === "saving"}
                onClick={() =>
                  primaryPrediction &&
                  void submitForecastAction(primaryPrediction, "accepted")
                }
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Accept
              </button>
              <button
                type="button"
                disabled={!primaryPrediction || actionState === "saving"}
                onClick={() => openOverride("modified")}
                className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" /> Modify
              </button>
              <button
                type="button"
                disabled={!primaryPrediction || actionState === "saving"}
                onClick={() => openOverride("rejected")}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Reject
              </button>
            </div>
          </div>
          {actionMessage && (
            <p
              className={`mt-3 text-sm ${
                actionState === "error"
                  ? "text-red-600"
                  : "text-green-700 dark:text-green-300"
              }`}
            >
              {actionMessage}
            </p>
          )}
        </section>

        <section className={`${glassStyles.panel} p-5`}>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-brand-blue" />
            <h2 className={glassStyles.sectionTitle}>AI Learning Log</h2>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Snapshots</dt>
              <dd className="text-lg font-semibold">
                {learningSummary?.forecast_snapshots ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Actions</dt>
              <dd className="text-lg font-semibold">
                {learningSummary?.operator_actions ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Outcomes</dt>
              <dd className="text-lg font-semibold">
                {learningSummary?.operational_outcomes ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Ready Rows</dt>
              <dd className="text-lg font-semibold">
                {learningSummary?.ground_truth_ready_rows ?? 0}
              </dd>
            </div>
          </dl>
          {metricsSummary?.avg_surge_f1 !== undefined && (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Active model avg Surge F1: {String(metricsSummary.avg_surge_f1)}
            </p>
          )}
        </section>
      </div>

      {overrideMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={submitOverride}
            className={`${glassStyles.panel} w-full max-w-lg p-5`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={glassStyles.sectionTitle}>
                  {overrideMode === "modified" ? "Modify Action" : "Reject Action"}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  A reason is required so the record can become useful
                  ground-truth after actual operations are logged.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOverrideMode(null)}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Reason
              <input
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                className={`${glassStyles.input} mt-1`}
                required
                placeholder="Local event, staff judgment, capacity constraint"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Final action
              <input
                value={finalAction}
                onChange={(event) => setFinalAction(event.target.value)}
                className={`${glassStyles.input} mt-1`}
                placeholder="What the operator will do"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Notes
              <textarea
                value={overrideNotes}
                onChange={(event) => setOverrideNotes(event.target.value)}
                className={`${glassStyles.input} mt-1 min-h-24`}
                placeholder="Optional context for review"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOverrideMode(null)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionState === "saving"}
                className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Feedback
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
