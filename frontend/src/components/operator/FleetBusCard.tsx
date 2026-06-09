import { Bus } from "lucide-react";
import Link from "next/link";
import { glassStyles } from "@/lib/design-system";
import type { Bus as BusType } from "@/lib/types";
import { surgeColorClass, surgeLabel } from "@/lib/utils";

interface FleetBusCardProps {
  bus: BusType;
}

export function FleetBusCard({ bus }: FleetBusCardProps) {
  const booked = bus.capacity - bus.available_seats;
  const pct = bus.capacity > 0 ? (booked / bus.capacity) * 100 : 0;
  const isFull = bus.available_seats <= 0;

  return (
    <article className={`${glassStyles.panel} p-5 flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bus className="w-5 h-5 text-brand-blue shrink-0" aria-hidden />
          <span className="font-mono font-semibold text-foreground">
            {bus.plate_number}
          </span>
        </div>
        <span
          className={`${glassStyles.badge} ${surgeColorClass(bus.surge_probability)}`}
        >
          {surgeLabel(bus.surge_probability)} surge
        </span>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {bus.origin} → {bus.destination}
      </p>
      <div>
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>
            {booked}/{bus.capacity} booked
          </span>
          <span className="flex items-center gap-1.5">
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
              {pct.toFixed(0)}%
            </span>
          </span>
        </div>
        <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-2 overflow-hidden">
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
      <Link
        href={`/operator/buses/${bus.id}/seats`}
        className={`${glassStyles.button} w-full text-sm text-center`}
      >
        View seats &amp; passengers
      </Link>
    </article>
  );
}
