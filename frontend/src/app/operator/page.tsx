"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, Bus, Check, ClipboardCheck, Pencil, RotateCcw, TrendingUp, Users, X } from "lucide-react";
import { BusCapacityList } from "@/components/operator/BusCapacityList";
import { DataStatusBanner } from "@/components/operator/DataStatusBanner";
import { StatCard } from "@/components/operator/StatCard";
import { SurgeForecastChart } from "@/components/operator/SurgeForecastChart";
import { PageHeader } from "@/components/ui/PageHeader";
import { useForecast } from "@/hooks/useForecast";
import { useOperatorFleet, todayIsoDate } from "@/hooks/useOperatorFleet";
import { getLearningLogSummary, recordForecastAction, recordOperationalOutcome, replayRetraining } from "@/lib/api";
import { glassStyles } from "@/lib/design-system";
import { DEMO_TENANT_ID } from "@/lib/demo-config";
import {
  DEMO_ROUTES,
  MOCK_BUS_CAPACITY,
  OPERATOR_STATS,
} from "@/lib/operator-mock";
import type { BusCapacityEntry } from "@/lib/operator-mock";
import type { LearningLogSummary, RetrainingReplay, SurgePrediction } from "@/lib/types";

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
  const [learningRefresh, setLearningRefresh] = useState(0);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [outcomeState, setOutcomeState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [outcomeForm, setOutcomeForm] = useState({
    actualPassengerCount: "",
    peakQueueLength: "",
    averageWaitTime: "",
    waitTimeP95: "",
    extraBuses: "0",
    lanesOpened: "1",
    missedBoardings: "0",
    overcrowdingIncident: false,
  });
  const [replay, setReplay] = useState<RetrainingReplay | null>(null);
  const [replayState, setReplayState] = useState<"idle" | "loading" | "error">("idle");
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
  }, [routeId, actionState, learningRefresh]);

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

  function openOutcomeForm() {
    setOutcomeForm((current) => ({
      ...current,
      actualPassengerCount: String(primaryPrediction?.predicted_volume ?? ""),
    }));
    setOutcomeState("idle");
    setOutcomeOpen(true);
  }

  async function submitOutcome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!primaryPrediction) return;
    setOutcomeState("saving");
    try {
      await recordOperationalOutcome({
        tenant_id: DEMO_TENANT_ID,
        route_id: routeId,
        service_date: primaryPrediction.forecast_date,
        actual_passenger_count: Number(outcomeForm.actualPassengerCount),
        peak_queue_length: outcomeForm.peakQueueLength ? Number(outcomeForm.peakQueueLength) : null,
        average_wait_time_minutes: outcomeForm.averageWaitTime ? Number(outcomeForm.averageWaitTime) : null,
        wait_time_p95_minutes: outcomeForm.waitTimeP95 ? Number(outcomeForm.waitTimeP95) : null,
        extra_buses_dispatched: Number(outcomeForm.extraBuses),
        lanes_opened: Number(outcomeForm.lanesOpened),
        missed_boardings: Number(outcomeForm.missedBoardings),
        overcrowding_incident: outcomeForm.overcrowdingIncident,
        recorded_by: "demo-admin",
        notes: "Operator-entered prototype outcome",
      });
      setOutcomeState("saved");
      setLearningRefresh((value) => value + 1);
      setOutcomeOpen(false);
    } catch {
      setOutcomeState("error");
    }
  }

  async function runReplay() {
    setReplayState("loading");
    try {
      setReplay(await replayRetraining());
      setReplayState("idle");
    } catch {
      setReplayState("error");
    }
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
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={openOutcomeForm}
              disabled={!primaryPrediction}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700"
            >
              <ClipboardCheck className="h-4 w-4" /> Record Outcome
            </button>
            <button
              type="button"
              onClick={() => void runReplay()}
              disabled={replayState === "loading"}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-blue px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              {replayState === "loading" ? "Replaying" : "Replay Learning Cycle"}
            </button>
          </div>
          {replay && (
            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950">
              <p className="font-semibold capitalize">Decision: {replay.decision.replaceAll("_", " ")}</p>
              <p className="mt-1">Candidate F1: {replay.candidate_metrics.avg_surge_f1} · MAE: {replay.candidate_metrics.avg_mae}</p>
              <p className="mt-2 text-blue-800">{replay.disclosure}</p>
            </div>
          )}
          {replayState === "error" && (
            <p className="mt-3 text-xs text-red-600">Demo replay is disabled or unavailable.</p>
          )}
        </section>
      </div>

      {outcomeOpen && primaryPrediction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={submitOutcome} className={`${glassStyles.panel} max-h-[90vh] w-full max-w-xl overflow-y-auto p-5`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={glassStyles.sectionTitle}>Record Route Outcome</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {primaryPrediction.forecast_date} · Synthetic prototype data only
                </p>
              </div>
              <button type="button" onClick={() => setOutcomeOpen(false)} className="rounded-md p-2" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ["Actual passengers", "actualPassengerCount"],
                ["Peak queue length", "peakQueueLength"],
                ["Average wait minutes", "averageWaitTime"],
                ["P95 wait minutes", "waitTimeP95"],
                ["Extra buses", "extraBuses"],
                ["Lanes opened", "lanesOpened"],
                ["Missed boardings", "missedBoardings"],
              ].map(([label, key]) => (
                <label key={key} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {label}
                  <input
                    type="number"
                    min="0"
                    step={key === "waitTimeP95" || key === "averageWaitTime" ? "0.1" : "1"}
                    required={key === "actualPassengerCount"}
                    value={outcomeForm[key as keyof typeof outcomeForm] as string}
                    onChange={(event) => setOutcomeForm((current) => ({ ...current, [key]: event.target.value }))}
                    className={`${glassStyles.input} mt-1`}
                  />
                </label>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={outcomeForm.overcrowdingIncident}
                onChange={(event) => setOutcomeForm((current) => ({ ...current, overcrowdingIncident: event.target.checked }))}
              />
              Overcrowding incident occurred
            </label>
            {outcomeState === "error" && <p className="mt-3 text-sm text-red-600">Could not save the outcome.</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOutcomeOpen(false)} className="rounded-md border px-4 py-2 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={outcomeState === "saving"} className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {outcomeState === "saving" ? "Saving" : "Save Outcome"}
              </button>
            </div>
          </form>
        </div>
      )}

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
