import { glassStyles } from "@/lib/design-system";
import type { BusCapacityEntry } from "@/lib/operator-mock";
import { CapacityMeter } from "@/components/ui/CapacityMeter";

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
            <div key={bus.plate} className="rounded-2xl bg-white/45 p-3 dark:bg-slate-900/35">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {bus.plate}
                  </span>
                  <p className="text-xs text-slate-400">{bus.route}</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {isFull && (
                    <span
                      className={`${glassStyles.badge} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200`}
                    >
                      Full
                    </span>
                  )}
                  {pct.toFixed(0)}%
                </span>
              </div>
              <CapacityMeter
                booked={bus.booked}
                capacity={bus.capacity}
                label="Booked"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
