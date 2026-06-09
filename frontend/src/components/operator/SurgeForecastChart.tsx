"use client";

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

  const chartData = predictions.map((p) => ({
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
      <div className="mb-4">
        <h2 className={glassStyles.sectionTitle}>7-Day Surge Forecast</h2>
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
