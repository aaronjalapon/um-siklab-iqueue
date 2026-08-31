"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  FlaskConical,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { glassStyles } from "@/lib/design-system";
import {
  getRetrainStatus,
  listRetrainJobs,
  reloadModel,
  triggerRetrain,
} from "@/lib/api";
import type { RetrainJob, RetrainJobStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES: RetrainJobStatus[] = [
  "queued",
  "checking_data",
  "training",
  "evaluating",
  "promoting",
];

function statusColor(status: RetrainJobStatus): string {
  switch (status) {
    case "promoted": return "text-green-600 dark:text-green-400";
    case "rejected":
    case "skipped": return "text-amber-500 dark:text-amber-400";
    case "failed": return "text-red-600 dark:text-red-400";
    case "training":
    case "evaluating":
    case "promoting": return "text-brand-blue";
    default: return "text-slate-500 dark:text-slate-400";
  }
}

function statusBg(status: RetrainJobStatus): string {
  switch (status) {
    case "promoted": return "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800";
    case "rejected":
    case "skipped": return "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800";
    case "failed": return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800";
    default: return "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800";
  }
}

function StatusIcon({ status }: { status: RetrainJobStatus }) {
  const cls = `h-5 w-5 ${statusColor(status)}`;
  if (ACTIVE_STATUSES.includes(status))
    return <Loader2 className={`${cls} animate-spin`} />;
  if (status === "promoted") return <CheckCircle2 className={cls} />;
  if (status === "failed") return <XCircle className={cls} />;
  if (status === "rejected") return <AlertTriangle className={cls} />;
  return <Clock className={cls} />;
}

function statusLabel(status: RetrainJobStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function MetricsCompare({
  label,
  champion,
  candidate,
  higherBetter,
  format,
}: {
  label: string;
  champion: number;
  candidate: number;
  higherBetter: boolean;
  format: (v: number) => string;
}) {
  const improved = higherBetter ? candidate > champion : candidate < champion;
  const pct = champion !== 0
    ? (((candidate - champion) / Math.abs(champion)) * 100).toFixed(1)
    : "—";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 p-4">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        {label}
      </p>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] text-slate-400 mb-0.5">Champion</p>
          <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{format(champion)}</p>
        </div>
        <div className={`flex flex-col items-center gap-1 ${improved ? "text-green-600" : "text-red-500"}`}>
          {improved ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          <span className="text-xs font-semibold">{improved ? "+" : ""}{pct}%</span>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-400 mb-0.5">Candidate</p>
          <p className={`text-xl font-bold ${improved ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {format(candidate)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ModelRetrainingPage() {
  const [jobs, setJobs] = useState<RetrainJob[]>([]);
  const [activeJob, setActiveJob] = useState<RetrainJob | null>(null);
  const [epochs, setEpochs] = useState(80);
  const [minRows, setMinRows] = useState(30);
  const [triggerState, setTriggerState] = useState<"idle" | "starting" | "error">("idle");
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [reloadState, setReloadState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [reloadMsg, setReloadMsg] = useState<string | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await listRetrainJobs(10);
      setJobs(data);
      setActiveJob(data[0] ?? null);
      setJobsLoading(false);
    } catch {
      setJobsLoading(false);
    }
  }, []);

  const pollActive = useCallback(async () => {
    try {
      const job = await getRetrainStatus();
      setActiveJob(job);
      if (!ACTIVE_STATUSES.includes(job.status)) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        await fetchJobs();
      }
    } catch {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [fetchJobs]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchJobs();
    }, 0);
    return () => clearTimeout(timeout);
  }, [fetchJobs]);

  // Start polling if the latest job is still active
  useEffect(() => {
    if (jobs.length === 0) return;
    const latest = jobs[0];
    if (ACTIVE_STATUSES.includes(latest.status)) {
      if (!pollRef.current) {
        pollRef.current = setInterval(() => void pollActive(), 3000);
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobs, pollActive]);

  async function handleTrigger() {
    setTriggerState("starting");
    setTriggerError(null);
    try {
      const queued = await triggerRetrain(epochs, minRows);
      setActiveJob({
        job_id: queued.job_id,
        status: "queued",
        started_at: new Date().toISOString(),
        finished_at: null,
        ground_truth_rows: null,
        decision: null,
        archived_champion: null,
        message: null,
        error: null,
        epochs,
      });
      setTriggerState("idle");
      // Start polling immediately
      if (!pollRef.current) {
        pollRef.current = setInterval(() => void pollActive(), 3000);
      }
    } catch (err) {
      setTriggerState("error");
      setTriggerError(err instanceof Error ? err.message : "Could not start retraining.");
    }
  }

  async function handleReload() {
    setReloadState("loading");
    setReloadMsg(null);
    try {
      const res = await reloadModel();
      setReloadState("done");
      setReloadMsg(`Reloaded → ${res.model_version ?? "unknown"} · ${res.bundle_status} · ${res.loaded_routes.length} routes`);
    } catch (err) {
      setReloadState("error");
      setReloadMsg(err instanceof Error ? err.message : "Reload failed.");
    }
  }

  const isRunning = activeJob ? ACTIVE_STATUSES.includes(activeJob.status) : false;

  return (
    <div className={glassStyles.pageContainer}>
      <PageHeader
        eyebrow="AI model management"
        title="Model Retraining"
        description="Trigger champion/candidate retraining, track job progress, and hot-swap the live model without restarting the server."
      />

      {/* ── Top controls ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Trigger panel */}
        <section className={`${glassStyles.panel} p-5 lg:col-span-2`}>
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="h-5 w-5 text-brand-blue" />
            <h2 className={glassStyles.sectionTitle}>Trigger Retraining</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              LSTM Epochs
              <input
                type="number"
                min={1} max={300}
                value={epochs}
                onChange={(e) => setEpochs(Number(e.target.value))}
                disabled={isRunning}
                className={`${glassStyles.input} mt-1 w-full`}
              />
              <span className="text-xs text-slate-400 mt-1 block">Training iterations (default 80)</span>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Min Ground-Truth Rows
              <input
                type="number"
                min={1}
                value={minRows}
                onChange={(e) => setMinRows(Number(e.target.value))}
                disabled={isRunning}
                className={`${glassStyles.input} mt-1 w-full`}
              />
              <span className="text-xs text-slate-400 mt-1 block">Rows needed before retraining triggers</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              id="btn-trigger-retrain"
              type="button"
              disabled={isRunning || triggerState === "starting"}
              onClick={() => void handleTrigger()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {triggerState === "starting" || isRunning
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Zap className="h-4 w-4" />}
              {isRunning ? "Retraining in progress…" : "Start Retraining"}
            </button>
            <button
              id="btn-reload-model"
              type="button"
              disabled={reloadState === "loading"}
              onClick={() => void handleReload()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {reloadState === "loading"
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <RefreshCw className="h-4 w-4" />}
              Hot-Reload Artifacts
            </button>
          </div>

          {triggerError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{triggerError}</p>
          )}
          {reloadMsg && (
            <p className={`mt-3 text-sm ${reloadState === "error" ? "text-red-600" : "text-green-700 dark:text-green-300"}`}>
              {reloadMsg}
            </p>
          )}

          {/* Pipeline stages legend */}
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Pipeline stages</p>
            <div className="flex flex-wrap gap-2">
              {["checking_data", "training", "evaluating", "promoting"].map((s) => (
                <span key={s} className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {statusLabel(s as RetrainJobStatus)}
                </span>
              ))}
              <span className="rounded-full border border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/40 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-300">→ Promoted</span>
            </div>
          </div>
        </section>

        {/* Gate rules panel */}
        <section className={`${glassStyles.panel} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <h2 className={glassStyles.sectionTitle}>Promotion Gate</h2>
          </div>
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {[
              { icon: ArrowUpCircle, color: "text-green-500", rule: "Surge F1 must improve" },
              { icon: ArrowUpCircle, color: "text-green-500", rule: "OR Surge Recall must improve" },
              { icon: AlertTriangle, color: "text-amber-500", rule: "AND MAE regression ≤ 5%" },
              { icon: Database, color: "text-brand-blue", rule: `≥ ${minRows} ground-truth rows required` },
            ].map(({ icon: Icon, color, rule }) => (
              <li key={rule} className="flex items-start gap-2.5">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-500 dark:text-slate-400">
            On promotion, the previous champion is archived with a timestamp and the live service hot-swaps without a restart.
          </div>
        </section>
      </div>

      {/* ── Active job status ── */}
      {activeJob && (
        <section className={`${glassStyles.panel} p-5 border ${statusBg(activeJob.status)}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <StatusIcon status={activeJob.status} />
              <div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  {statusLabel(activeJob.status)}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Job {activeJob.job_id.slice(0, 8)}…
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {activeJob.epochs != null && (
                <span className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1">
                  {activeJob.epochs} epochs
                </span>
              )}
              {activeJob.ground_truth_rows != null && (
                <span className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1">
                  {activeJob.ground_truth_rows} GT rows
                </span>
              )}
              {activeJob.started_at && (
                <span className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1">
                  Started {new Date(activeJob.started_at).toLocaleTimeString()}
                </span>
              )}
              {activeJob.finished_at && (
                <span className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1">
                  Finished {new Date(activeJob.finished_at).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {activeJob.message && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{activeJob.message}</p>
          )}
          {activeJob.error && (
            <pre className="mb-3 whitespace-pre-wrap break-words rounded-lg bg-red-50/70 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {activeJob.error}
            </pre>
          )}

          {/* Metrics comparison */}
          {activeJob.decision && activeJob.decision.champion_metrics && activeJob.decision.candidate_metrics && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Champion vs Candidate — {activeJob.decision.champion_metrics.routes_evaluated} routes evaluated
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricsCompare
                  label="Avg Surge F1"
                  champion={activeJob.decision.champion_metrics.avg_surge_f1}
                  candidate={activeJob.decision.candidate_metrics.avg_surge_f1}
                  higherBetter
                  format={(v) => v.toFixed(3)}
                />
                <MetricsCompare
                  label="Avg Surge Recall"
                  champion={activeJob.decision.champion_metrics.avg_surge_recall}
                  candidate={activeJob.decision.candidate_metrics.avg_surge_recall}
                  higherBetter
                  format={(v) => v.toFixed(3)}
                />
                <MetricsCompare
                  label="Avg MAE (passengers)"
                  champion={activeJob.decision.champion_metrics.avg_mae}
                  candidate={activeJob.decision.candidate_metrics.avg_mae}
                  higherBetter={false}
                  format={(v) => v.toFixed(1)}
                />
              </div>
              {activeJob.decision.reasons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeJob.decision.reasons.map((r) => (
                    <span
                      key={r}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        activeJob.decision!.passed
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}
                    >
                      {r.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
              {activeJob.archived_champion && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Archived:</span>{" "}
                  <span className="font-mono">{activeJob.archived_champion.split("/").pop()}</span>
                </p>
              )}
            </div>
          )}

          {/* Progress bar for active jobs */}
          {isRunning && (
            <div className="mt-4">
              <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full bg-brand-blue animate-[pulse_1.5s_ease-in-out_infinite] w-1/2" />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Auto-refreshing every 3 seconds…</p>
            </div>
          )}
        </section>
      )}

      {/* ── Job history ── */}
      <section className={`${glassStyles.panel} p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-500" />
            <h2 className={glassStyles.sectionTitle}>Job History</h2>
          </div>
          <button
            id="btn-refresh-jobs"
            type="button"
            onClick={() => void fetchJobs()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {jobsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`${glassStyles.skeleton} h-16 w-full`} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center">
            <Activity className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No jobs yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Click &ldquo;Start Retraining&rdquo; to queue your first job.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div
                key={job.job_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/40 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusIcon status={job.status} />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${statusColor(job.status)}`}>
                      {statusLabel(job.status)}
                    </p>
                    <p className="text-xs font-mono text-slate-400 truncate">
                      {job.job_id.slice(0, 16)}…
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  {job.epochs != null && <span>{job.epochs} epochs</span>}
                  {job.ground_truth_rows != null && <span>· {job.ground_truth_rows} GT rows</span>}
                  {job.decision && (
                    <span className={`font-semibold ${job.decision.passed ? "text-green-600" : "text-amber-500"}`}>
                      · {job.decision.passed ? "Promoted" : "Rejected"} (F1 {job.decision.candidate_metrics.avg_surge_f1.toFixed(3)})
                    </span>
                  )}
                  {job.started_at && (
                    <span className="text-slate-400">
                      · {new Date(job.started_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
