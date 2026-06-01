import { glassStyles } from "@/lib/design-system";
import type { BusCapacityEntry } from "@/lib/operator-mock";

interface BusCapacityListProps {
  buses: BusCapacityEntry[];
}

export function BusCapacityList({ buses }: BusCapacityListProps) {
  const sorted = [...buses].sort(
    (a, b) => b.booked / b.capacity - a.booked / a.capacity
  );

  return (
    <div className={`${glassStyles.panel} p-6 flex flex-col xl:col-span-1`}>
      <h2 className={glassStyles.sectionTitle}>Bus Capacity</h2>
      <div className="space-y-5 flex-1 mt-6">
        {sorted.map((bus) => {
          const pct = (bus.booked / bus.capacity) * 100;
          const isFull = pct >= 100;
          return (
            <div key={bus.plate} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-end gap-2">
                <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-200">
                  {bus.plate}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  {bus.booked}/{bus.capacity}
                  {isFull && (
                    <span
                      className={`${glassStyles.badge} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200`}
                    >
                      Full
                    </span>
                  )}
                  <span
                    className={
                      pct > 90
                        ? "text-red-500"
                        : pct > 70
                          ? "text-yellow-600"
                          : "text-green-600"
                    }
                  >
                    ({pct.toFixed(0)}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-2 overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full motion-safe-animate transition-all duration-700 ease-out ${
                    pct > 90
                      ? "bg-gradient-to-r from-red-400 to-red-600"
                      : pct > 70
                        ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
                        : "bg-gradient-to-r from-green-400 to-green-500"
                  }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
