interface CapacityMeterProps {
  booked: number;
  capacity: number;
  label?: string;
  className?: string;
}

function capacityColor(percent: number): string {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 70) return "bg-amber-500";
  return "bg-green-500";
}

function capacityTextColor(percent: number): string {
  if (percent >= 90) return "text-red-600 dark:text-red-300";
  if (percent >= 70) return "text-amber-600 dark:text-amber-300";
  return "text-green-600 dark:text-green-300";
}

export function CapacityMeter({
  booked,
  capacity,
  label = "Capacity",
  className = "",
}: CapacityMeterProps) {
  const percent = capacity > 0 ? Math.round((booked / capacity) * 100) : 0;
  const boundedPercent = Math.min(Math.max(percent, 0), 100);

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span className="flex items-center gap-2 font-medium">
          <span>
            {booked}/{capacity}
          </span>
          <span className={capacityTextColor(boundedPercent)}>
            {boundedPercent}%
          </span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/70">
        <div
          className={`h-full rounded-full transition-all duration-700 ${capacityColor(
            boundedPercent
          )}`}
          style={{ width: `${boundedPercent}%` }}
          role="progressbar"
          aria-label={`${label}: ${boundedPercent}% full`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={boundedPercent}
        />
      </div>
    </div>
  );
}
