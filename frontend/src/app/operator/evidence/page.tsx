"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, FileCheck2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { getEvidenceSummary } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { glassStyles } from "@/lib/design-system";
import type { EvidenceSummary } from "@/lib/types";

function formatMetric(value: unknown): string {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(3);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value.replaceAll("_", " ");
  return "Not reported";
}

function metricEntries(metrics: Record<string, unknown>): [string, unknown][] {
  return Object.entries(metrics).flatMap(([key, value]) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      key !== "confusion_matrix"
    ) {
      return Object.entries(value as Record<string, unknown>).map(
        ([nestedKey, nestedValue]) => [`${key} ${nestedKey}`, nestedValue] as [string, unknown]
      );
    }
    return [[key, value] as [string, unknown]];
  });
}

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<EvidenceSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void getEvidenceSummary()
      .then(setEvidence)
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className={glassStyles.pageContainer}>
      <PageHeader
        eyebrow="Validation and governance"
        title={`${BRAND.name} Evidence`}
        description="Reproducible model evidence and transparent prototype limitations."
      />

      <section className="border-y border-amber-200 bg-amber-50 px-4 py-4 text-amber-950">
        <div className="mx-auto flex max-w-6xl items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <h2 className="font-semibold">Synthetic-data prototype</h2>
            <p className="mt-1 text-sm">
              {evidence?.data_disclosure.statement ?? "Metrics are loading. No field-pilot impact is claimed."}
            </p>
          </div>
        </div>
      </section>

      {failed && <p className="text-sm text-red-600">Evidence artifacts are unavailable.</p>}
      {!evidence && !failed && <p className="text-sm text-slate-500">Loading evidence…</p>}

      {evidence && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className={`${glassStyles.panel} p-4`}>
              <Database className="h-5 w-5 text-brand-blue" />
              <p className="mt-3 text-xs text-slate-500">Bundle</p>
              <p className="font-semibold">{evidence.active_bundle.version ?? "Unversioned"}</p>
            </div>
            <div className={`${glassStyles.panel} p-4`}>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="mt-3 text-xs text-slate-500">Bundle status</p>
              <p className="font-semibold capitalize">{evidence.active_bundle.status}</p>
            </div>
            <div className={`${glassStyles.panel} p-4`}>
              <FileCheck2 className="h-5 w-5 text-brand-blue" />
              <p className="mt-3 text-xs text-slate-500">Loaded routes</p>
              <p className="font-semibold">{evidence.active_bundle.loaded_routes.length}</p>
            </div>
            <div className={`${glassStyles.panel} p-4`}>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="mt-3 text-xs text-slate-500">Surge classifier</p>
              <p className="font-semibold">{evidence.active_bundle.classifier_loaded ? "Loaded" : "Unavailable"}</p>
            </div>
          </section>

          <section className="overflow-hidden border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <caption className="px-5 py-4 text-left text-lg font-semibold">
                  {evidence.active_bundle.metadata.evaluation_protocol === "chronological_70_15_15_untouched_test"
                    ? "Untouched-test model comparison"
                    : "Legacy validation comparison · canonical retrain required"}
                </caption>
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
                  <tr>{["Model", "MAE", "RMSE", "MAPE", "Precision", "Recall", "F1", "False alarm"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr>
                </thead>
                <tbody>
                  {evidence.model_comparison.map((row, index) => (
                    <tr key={`${row.model}-${index}`} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3 font-medium">{formatMetric(row.model)}</td>
                      {[
                        "mae", "rmse", "mape", "surge_precision", "surge_recall", "surge_f1", "false_alarm_rate",
                      ].map((key) => <td key={key} className="px-4 py-3 tabular-nums">{formatMetric(row[key])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Subsystem validation</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(evidence.subsystems).map(([name, metrics]) => (
                <div key={name} className={`${glassStyles.panel} p-4`}>
                  <h3 className="font-semibold capitalize">{name.replaceAll("_", " ")}</h3>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    {metricEntries(metrics).slice(0, 12).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs capitalize text-slate-500">{key.replaceAll("_", " ")}</dt>
                        <dd className="font-medium">{formatMetric(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
