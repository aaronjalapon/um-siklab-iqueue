import { Bus } from "lucide-react";
import Link from "next/link";
import { CapacityMeter } from "@/components/ui/CapacityMeter";
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
      <CapacityMeter booked={booked} capacity={bus.capacity} label="Booked" />
      <div className="flex flex-wrap gap-2 text-xs">
        {isFull && (
          <span
            className={`${glassStyles.badge} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200`}
          >
            Full
          </span>
        )}
        {pct >= 90 && !isFull && (
          <span
            className={`${glassStyles.badge} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200`}
          >
            Nearly full
          </span>
        )}
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
