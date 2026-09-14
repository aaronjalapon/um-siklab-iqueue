"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Accessibility,
  BusFront,
  CalendarDays,
  Clock,
  ListFilter,
  MapPin,
  Search,
} from "lucide-react";
import { CapacityMeter } from "@/components/ui/CapacityMeter";
import { BookingProgress } from "@/components/ui/BookingProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import { searchBuses } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { glassStyles } from "@/lib/design-system";
import type { Bus } from "@/lib/types";
import { formatDate, surgeColorClass, surgeLabel } from "@/lib/utils";

const QUICK_ROUTES = [
  { origin: "Davao City", destination: "Cagayan de Oro", label: "Davao -> CDO" },
  { origin: "Davao City", destination: "General Santos", label: "Davao -> GenSan" },
  { origin: "Davao City", destination: "Cotabato City", label: "Davao -> Cotabato" },
  { origin: "Cagayan de Oro", destination: "Iligan City", label: "CDO -> Iligan" },
];

type SortMode = "recommended" | "seats" | "surge" | "price";

function todayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const ROUTE_BASE_FARES: Record<string, number> = {
  "davao city->cagayan de oro": 670,
  "cagayan de oro->davao city": 670,
  "davao city->general santos": 540,
  "general santos->davao city": 540,
  "davao city->cotabato city": 500,
  "cotabato city->davao city": 500,
  "cagayan de oro->iligan city": 400,
  "iligan city->cagayan de oro": 400,
  "davao city->butuan city": 620,
  "butuan city->davao city": 620,
  "cotabato city->zamboanga city": 750,
  "zamboanga city->cotabato city": 750,
};

function calculateFareFallback(
  origin: string,
  destination: string,
  capacity: number
): number {
  const orig = origin.toLowerCase().trim();
  const dest = destination.toLowerCase().trim();
  let baseFare = ROUTE_BASE_FARES[`${orig}->${dest}`];

  if (!baseFare) {
    if (
      (orig.includes("davao") && dest.includes("cagayan")) ||
      (orig.includes("cagayan") && dest.includes("davao"))
    ) {
      baseFare = 670;
    } else if (
      (orig.includes("davao") &&
        (dest.includes("gensan") || dest.includes("general santos"))) ||
      ((orig.includes("gensan") || orig.includes("general santos")) &&
        dest.includes("davao"))
    ) {
      baseFare = 540;
    } else if (
      (orig.includes("davao") && dest.includes("cotabato")) ||
      (orig.includes("cotabato") && dest.includes("davao"))
    ) {
      baseFare = 500;
    } else if (
      (orig.includes("cagayan") && dest.includes("iligan")) ||
      (orig.includes("iligan") && dest.includes("cagayan"))
    ) {
      baseFare = 400;
    } else if (
      (orig.includes("davao") && dest.includes("butuan")) ||
      (orig.includes("butuan") && dest.includes("davao"))
    ) {
      baseFare = 620;
    } else if (
      (orig.includes("cotabato") && dest.includes("zamboanga")) ||
      (orig.includes("zamboanga") && dest.includes("cotabato"))
    ) {
      baseFare = 750;
    } else {
      baseFare = 500;
    }
  }

  if (capacity >= 45) {
    return baseFare;
  }
  return Math.round((baseFare * 0.9) / 10) * 10;
}

function estimateFare(bus: Bus): number {
  if (bus.fare && bus.fare > 0) return bus.fare;
  return calculateFareFallback(bus.origin, bus.destination, bus.capacity);
}

function BusResultSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 sm:gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className={`${glassStyles.panel} min-h-[150px] p-3.5 sm:p-5 animate-pulse motion-reduce:animate-none flex flex-col justify-between`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-5 w-44 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="h-6 w-16 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-9 w-full rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  );
}

function BuyPageInner() {
  const searchParams = useSearchParams();

  const [origin, setOrigin] = useState(searchParams.get("origin") || "");
  const [destination, setDestination] = useState(
    searchParams.get("destination") || searchParams.get("dest") || ""
  );
  const [travelDate, setTravelDate] = useState(
    searchParams.get("date") || todayIsoDate()
  );
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("recommended");

  const canSearch = origin.trim().length > 0 && destination.trim().length > 0;

  const sortedBuses = useMemo(() => {
    const list = [...buses];

    list.sort((a, b) => {
      if (sortMode === "seats") return b.available_seats - a.available_seats;
      if (sortMode === "surge") {
        return (b.surge_probability ?? 0) - (a.surge_probability ?? 0);
      }
      if (sortMode === "price") return estimateFare(a) - estimateFare(b);

      const scoreA =
        a.available_seats * 2 - Math.round((a.surge_probability ?? 0) * 20);
      const scoreB =
        b.available_seats * 2 - Math.round((b.surge_probability ?? 0) * 20);
      return scoreB - scoreA;
    });

    return list;
  }, [buses, sortMode]);

  async function performSearch(
    searchOrigin = origin,
    searchDestination = destination,
    searchDate = travelDate
  ) {
    const trimmedOrigin = searchOrigin.trim();
    const trimmedDestination = searchDestination.trim();
    if (!trimmedOrigin || !trimmedDestination) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await searchBuses(
        trimmedOrigin,
        trimmedDestination,
        searchDate
      );
      setBuses(data.buses);
      if (data.buses.length === 0) {
        setError("No buses found for this route and date.");
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to search buses. Please try again."));
      setBuses([]);
    } finally {
      setLoading(false);
    }
  }

  function handleQuickRoute(routeOrigin: string, routeDestination: string) {
    setOrigin(routeOrigin);
    setDestination(routeDestination);
    void performSearch(routeOrigin, routeDestination, travelDate);
  }

  function buildPreferencesHref(bus: Bus): string {
    const params = new URLSearchParams({
      origin: origin.trim(),
      destination: destination.trim(),
      travel_date: travelDate,
      plate: bus.plate_number,
      capacity: String(bus.capacity),
      fare: String(estimateFare(bus)),
    });

    return `/book/${bus.id}/preferences?${params.toString()}`;
  }

  const routeSummary =
    hasSearched && canSearch
      ? `${origin.trim()} -> ${destination.trim()} on ${formatDate(travelDate)}`
      : `Search available inter-provincial buses and let ${BRAND.name} pick your best seat.`;

  return (
    <div className={`${glassStyles.pageContainer} max-w-6xl !space-y-3 sm:!space-y-5 !px-3 sm:!px-6 !py-3 sm:!py-6`}>
      <div className="hidden md:flex items-center justify-between">
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-brand-blue hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          Back home
        </Link>
      </div>

      <BookingProgress current="search" />

      <header className="min-w-0">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-brand-blue">
          Passenger booking
        </p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
          Find Your Bus
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {routeSummary}
        </p>
      </header>

      {/* Filter / Search Card — Compact on mobile */}
      <section className={`${glassStyles.panel} p-3 sm:p-4 md:p-5`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_1fr_180px] gap-2 sm:gap-3">
          <label className="flex items-center gap-2.5 rounded-xl border border-glass-border bg-white/50 px-3 py-2 sm:py-2.5 dark:bg-slate-900/50">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-green-500" />
            <input
              type="text"
              placeholder="Origin city"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void performSearch()}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </label>

          <label className="flex items-center gap-2.5 rounded-xl border border-glass-border bg-white/50 px-3 py-2 sm:py-2.5 dark:bg-slate-900/50">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-brand-orange" />
            <input
              type="text"
              placeholder="Destination city"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void performSearch()}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </label>

          <label className="flex items-center gap-2.5 rounded-xl border border-glass-border bg-white/50 px-3 py-2 sm:py-2.5 dark:bg-slate-900/50 sm:col-span-2 md:col-span-1">
            <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 outline-none dark:text-white"
            />
          </label>
        </div>

        {/* Quick Routes + Search Action Row */}
        <div className="mt-2.5 sm:mt-3.5 flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap min-w-0">
            <span className="shrink-0 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mr-0.5">
              Quick routes
            </span>
            {QUICK_ROUTES.map((route) => (
              <button
                key={route.label}
                type="button"
                onClick={() => handleQuickRoute(route.origin, route.destination)}
                className="shrink-0 rounded-full border border-glass-border bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-brand-blue/40 hover:text-brand-blue dark:bg-slate-900/50 dark:text-slate-300 active:scale-95"
              >
                {route.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void performSearch()}
            disabled={loading || !canSearch}
            className={`${glassStyles.primaryButton} inline-flex min-h-[38px] sm:min-h-11 items-center justify-center gap-2 text-xs sm:text-sm font-bold w-full lg:w-auto shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            {loading ? "Searching..." : "Search Tickets"}
          </button>
        </div>
      </section>

      {hasSearched && (
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm sm:text-base font-bold text-foreground">
                {loading
                  ? "Checking available buses..."
                  : `${buses.length} ${buses.length === 1 ? "bus" : "buses"} found`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-none">
                {origin.trim()} {"->"} {destination.trim()}
              </p>
            </div>

            {buses.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <ListFilter className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="rounded-xl border border-glass-border bg-white/60 dark:bg-slate-900/60 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                >
                  <option value="recommended">Recommended</option>
                  <option value="seats">Most seats</option>
                  <option value="surge">Highest surge</option>
                  <option value="price">Lowest fare</option>
                </select>
              </div>
            )}
          </div>

          {error && !loading && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:p-4 text-xs sm:text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">{error}</p>
                <p className="mt-0.5 text-amber-700 dark:text-amber-200">
                  Try another date, nearby terminal, or one of the quick routes.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <BusResultSkeleton />
          ) : sortedBuses.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 sm:gap-4">
              {sortedBuses.map((bus) => {
                const booked = bus.capacity - bus.available_seats;
                const isFull = bus.available_seats <= 0;

                return (
                  <article
                    key={bus.id}
                    className={`${glassStyles.panel} relative flex flex-col justify-between p-3.5 sm:p-5 transition-all hover:border-brand-blue/40`}
                  >
                    {/* Top Row: Badges, Route & Price */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {bus.plate_number}
                          </span>
                          <span className="rounded-md bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40 px-1.5 py-0.5 text-[11px] font-semibold text-brand-blue dark:text-blue-300">
                            {bus.capacity >= 45 ? "Regular Aircon Bus" : "Express Mini Bus"}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${surgeColorClass(
                              bus.surge_probability
                            )}`}
                          >
                            {surgeLabel(bus.surge_probability)} demand
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Clock className="h-3 w-3 text-brand-blue" />
                            Today window
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                          {bus.origin} <span className="text-brand-blue font-semibold">→</span> {bus.destination}
                        </h2>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg sm:text-xl font-extrabold text-brand-blue leading-tight">
                          PHP {estimateFare(bus)}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium">per seat</span>
                      </div>
                    </div>

                    {/* Middle strip: Capacity & Accessibility in one sleek horizontal row */}
                    <div className="mt-2.5 pt-2.5 border-t border-glass-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                          <BusFront className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                          <span className="truncate">{bus.available_seats} of {bus.capacity} seats left</span>
                        </span>
                        {/* Inline mini capacity bar */}
                        <div className="hidden xs:block h-1.5 w-16 sm:w-20 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              booked / bus.capacity > 0.8
                                ? "bg-red-500"
                                : booked / bus.capacity > 0.5
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.round((booked / bus.capacity) * 100))}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 rounded-lg px-2 py-0.5">
                        <Accessibility className="h-3 w-3 shrink-0" />
                        <span>{bus.accessibility_available_count} priority seats open</span>
                      </div>
                    </div>

                    {/* Bottom Row: Compact action button */}
                    <div className="mt-3">
                      {isFull ? (
                        <span
                          className="flex min-h-[38px] sm:min-h-10 w-full items-center justify-center gap-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-200/80 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500 cursor-not-allowed border border-transparent select-none"
                          aria-disabled="true"
                        >
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          Bus Full
                        </span>
                      ) : (
                        <Link
                          href={buildPreferencesHref(bus)}
                          prefetch={false}
                          className={`${glassStyles.successButton} flex min-h-[38px] sm:min-h-10 w-full items-center justify-center gap-2 text-xs sm:text-sm font-bold group active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2`}
                        >
                          <span>Continue to Preferences</span>
                          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            !error && (
              <div className={`${glassStyles.panel} py-8 text-center`}>
                <MapPin className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                <p className="font-semibold text-foreground text-sm sm:text-base">No buses found</p>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Try a different origin, destination, or date.
                </p>
              </div>
            )
          )}
        </section>
      )}
    </div>
  );
}

export default function BuyPage() {
  return (
    <Suspense
      fallback={
        <div className={`${glassStyles.pageContainer} max-w-6xl`}>
          <div className={`${glassStyles.skeleton} h-32`} />
          <BusResultSkeleton />
        </div>
      }
    >
      <BuyPageInner />
    </Suspense>
  );
}
