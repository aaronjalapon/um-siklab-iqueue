import { uiStyles } from "@/lib/design-system";
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
    <section className={`${uiStyles.surface} min-w-0 p-5 sm:p-6 xl:col-span-1`}>
      <div>
        <h2 className={uiStyles.sectionTitle}>Bus Capacity</h2>
        <p className="mt-1 text-sm text-ui-muted-foreground">
          Highest occupancy on this route
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {sorted.map((bus) => {
          const pct = (bus.booked / bus.capacity) * 100;
          const isFull = pct >= 100;
          return (
            <div key={bus.plate} className="clay-data-well min-w-0 rounded-xl border border-ui-border bg-ui-muted p-3.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {bus.plate}
                  </span>
                  <p className="mt-0.5 text-xs leading-5 text-ui-muted-foreground [overflow-wrap:anywhere]">
                    {bus.route}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-ui-muted-foreground">
                  {isFull && (
                    <span
                      className={`${uiStyles.badge} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200`}
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
    </section>
  );
}
