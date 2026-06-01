"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { glassStyles } from "@/lib/design-system";
import { surgeLabel } from "@/lib/utils";
import type { SurgePrediction } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./LoadingSkeleton";

interface SurgeForecastChartProps {
  predictions: SurgePrediction[];
  loading: boolean;
  onRetry?: () => void;
}

function surgeFill(surge: number): string {
  if (surge < 0.4) return "url(#colorGreen)";
  if (surge < 0.7) return "url(#colorYellow)";
  return "url(#colorRed)";
}

export function SurgeForecastChart({
  predictions,
  loading,
  onRetry,
}: SurgeForecastChartProps) {
  const [range, setRange] = useState<"7d" | "30d">("7d");

  if (loading) {
    return <LoadingSkeleton variant="chart" />;
  }

  if (predictions.length === 0) {
    return (
      <EmptyState
        title="No forecast data"
        description="Try another route or check your API connection."
        actionLabel="Retry"
        onAction={onRetry}
      />
    );
  }

  const displayPredictions =
    range === "30d"
      ? [...predictions, ...predictions.map((p, i) => ({
          ...p,
          forecast_date: (() => {
            const d = new Date(p.forecast_date);
            d.setDate(d.getDate() + 7 + i);
            return d.toISOString().split("T")[0];
          })(),
          predicted_volume: Math.floor(p.predicted_volume * (0.9 + i * 0.02)),
        }))].slice(0, 14)
      : predictions;

  const chartData = displayPredictions.map((p) => ({
    date: new Date(p.forecast_date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    volume: p.predicted_volume,
    surge: p.surge_probability,
    fill: surgeFill(p.surge_probability),
    holiday: p.is_holiday ? p.holiday_name : null,
    surgeLabel: surgeLabel(p.surge_probability),
  }));

  return (
    <div className={`${glassStyles.panel} p-6 xl:col-span-3`}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className={glassStyles.sectionTitle}>
          {range === "7d" ? "7-Day" : "Extended"} Surge Forecast
        </h2>
        <div
          className={glassStyles.segmentedControl}
          role="group"
          aria-label="Forecast range"
        >
          <button
            type="button"
            className={
              range === "7d"
                ? glassStyles.segmentedActive
                : glassStyles.segmentedInactive
            }
            onClick={() => setRange("7d")}
            aria-pressed={range === "7d"}
          >
            7 Days
          </button>
          <button
            type="button"
            className={
              range === "30d"
                ? glassStyles.segmentedActive
                : glassStyles.segmentedInactive
            }
            onClick={() => setRange("30d")}
            aria-pressed={range === "30d"}
            title="Demo: extended view from 7-day data"
          >
            30 Days
          </button>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <defs>
              <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="colorYellow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#eab308" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#eab308" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.2)"
              vertical={false}
            />
            <XAxis dataKey="date" fontSize={12} stroke="#94a3b8" />
            <YAxis fontSize={12} stroke="#94a3b8" />
            <Tooltip
              formatter={(value, name) => {
                if (name === "volume") return [`${value} passengers`, "Predicted Volume"];
                return [`${(Number(value) * 100).toFixed(0)}%`, "Surge Probability"];
              }}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as (typeof chartData)[0] | undefined;
                if (!item) return "";
                const holiday = item.holiday ? ` · ${item.holiday}` : "";
                return `${item.date} · Surge: ${item.surgeLabel}${holiday}`;
              }}
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(8px)",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            />
            <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded" aria-hidden /> Low Surge
          (&lt;40%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-500 rounded" aria-hidden /> Moderate
          (40–70%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded" aria-hidden /> High
          (&gt;70%)
        </span>
      </div>
    </div>
  );
}
