"use client";

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
  if (surge < 0.4) return "#22c55e";
  if (surge < 0.7) return "#eab308";
  return "#ef4444";
}

function formatForecastDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
    date: formatForecastDate(p.forecast_date),
    volume: p.predicted_volume,
    surge: p.surge_probability,
    fill: surgeFill(p.surge_probability),
    holiday: p.is_holiday ? p.holiday_name : null,
    surgeLabel: surgeLabel(p.surge_probability),
  }));
  const maxVolume = Math.max(...chartData.map((item) => item.volume), 1);
  const chartWidth = 720;
  const chartHeight = 320;
  const padding = { top: 16, right: 18, bottom: 54, left: 48 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const slotWidth = plotWidth / chartData.length;
  const barWidth = Math.min(54, slotWidth * 0.58);

  return (
    <div className={`${glassStyles.panel} p-6 xl:col-span-3`}>
      <div className="mb-4">
        <h2 className={glassStyles.sectionTitle}>7-Day Surge Forecast</h2>
      </div>
      <div className="h-80 min-h-[20rem] w-full min-w-0 overflow-hidden">
        <svg
          role="img"
          aria-label="Seven-day passenger volume and surge forecast"
          className="h-full w-full"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
        >
          <style>{`
            .forecast-bar {
              animation: forecast-bar-rise 560ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
              transform-box: fill-box;
              transform-origin: center bottom;
            }
            .forecast-label {
              animation: forecast-label-fade 420ms ease-out both;
            }
            @keyframes forecast-bar-rise {
              from { transform: scaleY(0.08); opacity: 0.35; }
              to { transform: scaleY(1); opacity: 0.88; }
            }
            @keyframes forecast-label-fade {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @media (prefers-reduced-motion: reduce) {
              .forecast-bar,
              .forecast-label {
                animation: none;
              }
            }
          `}</style>
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = padding.top + plotHeight * (1 - tick);
            const value = Math.round(maxVolume * tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(148,163,184,0.22)"
                  strokeDasharray={tick === 0 ? undefined : "4 4"}
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#94a3b8"
                >
                  {value}
                </text>
              </g>
            );
          })}
          {chartData.map((entry, index) => {
            const x = padding.left + slotWidth * index + (slotWidth - barWidth) / 2;
            const barHeight = Math.max(
              4,
              (entry.volume / maxVolume) * (plotHeight - 6)
            );
            const y = padding.top + plotHeight - barHeight;
            const label = `${entry.date}: ${entry.volume} passengers, ${entry.surgeLabel} surge`;
            return (
              <g key={entry.date}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="6"
                  fill={entry.fill}
                  opacity="0.88"
                  className="forecast-bar"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <title>{label}</title>
                </rect>
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="#64748b"
                  className="forecast-label"
                  style={{ animationDelay: `${180 + index * 80}ms` }}
                >
                  {entry.volume}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 24}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#94a3b8"
                >
                  {entry.date.split(",")[0]}
                </text>
              </g>
            );
          })}
        </svg>
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
