"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
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

function estimateFare(bus: Bus): number {
  return Math.round(200 + (bus.surge_probability ?? 0) * 150);
}

function BusResultSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className={`${glassStyles.panel} min-h-[280px] p-5 animate-pulse motion-reduce:animate-none`}
        >
          <div className="mb-6 flex items-start justify-between">
            <div className="h-7 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-6 w-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="space-y-4">
            <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="mt-8 h-11 rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  );
}

function BuyPageInner() {
  const router = useRouter();
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

  function handleBook(bus: Bus) {
    const params = new URLSearchParams({
      date: travelDate,
      origin: bus.origin,
      dest: bus.destination,
    });

    router.push(`/book/${bus.id}/preferences?${params.toString()}`);
  }

  const routeSummary =
    hasSearched && canSearch
      ? `${origin.trim()} -> ${destination.trim()} on ${formatDate(travelDate)}`
      : "Search available inter-provincial buses and let IQueue pick your best seat.";

  return (
    <div className={`${glassStyles.pageContainer} max-w-6xl`}>
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back home
      </Link>

      <BookingProgress current="search" />

      <PageHeader
        eyebrow="Passenger booking"
        title="Find Your Bus"
        description={routeSummary}
      />

      <section className={`${glassStyles.panel} p-4 md:p-5`}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_180px]">
          <label className="flex items-center gap-3 rounded-xl border border-glass-border bg-white/50 px-3 py-3 dark:bg-slate-900/50">
            <span className="h-3 w-3 shrink-0 rounded-full border-2 border-green-500" />
            <input
              type="text"
              placeholder="Origin city"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void performSearch()}
              className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-glass-border bg-white/50 px-3 py-3 dark:bg-slate-900/50">
            <span className="h-3 w-3 shrink-0 rounded-full border-2 border-brand-orange" />
            <input
              type="text"
              placeholder="Destination city"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void performSearch()}
              className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-glass-border bg-white/50 px-3 py-3 dark:bg-slate-900/50">
            <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none dark:text-white"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="self-center text-xs font-medium text-slate-400">
              Quick routes
            </span>
            {QUICK_ROUTES.map((route) => (
              <button
                key={route.label}
                type="button"
                onClick={() => handleQuickRoute(route.origin, route.destination)}
                className="rounded-full border border-glass-border bg-white/60 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand-blue/40 hover:text-brand-blue dark:bg-slate-900/50 dark:text-slate-300"
              >
                {route.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void performSearch()}
            disabled={loading || !canSearch}
            className={`${glassStyles.primaryButton} inline-flex min-h-11 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Search className="h-4 w-4" aria-hidden />
            {loading ? "Searching..." : "Search Tickets"}
          </button>
        </div>
      </section>

      {hasSearched && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold text-foreground">
                {loading
                  ? "Checking available buses"
                  : `${buses.length} ${buses.length === 1 ? "bus" : "buses"} found`}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {origin.trim()} {"->"} {destination.trim()}
              </p>
            </div>

            {buses.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <ListFilter className="h-4 w-4" aria-hidden />
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className={`${glassStyles.input} py-2 text-sm`}
                >
                  <option value="recommended">Recommended</option>
                  <option value="seats">Most seats</option>
                  <option value="surge">Highest surge</option>
                  <option value="price">Lowest fare</option>
                </select>
              </label>
            )}
          </div>

          {error && !loading && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">{error}</p>
                <p className="mt-1 text-amber-700 dark:text-amber-200">
                  Try another date, nearby terminal, or one of the quick routes.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <BusResultSkeleton />
          ) : sortedBuses.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sortedBuses.map((bus) => {
                const booked = bus.capacity - bus.available_seats;
                const isFull = bus.available_seats <= 0;

                return (
                  <article
                    key={bus.id}
                    className={`${glassStyles.panel} flex min-h-[300px] flex-col p-5`}
                  >
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {bus.plate_number}
                          </span>
                          <span
                            className={`${glassStyles.badge} ${surgeColorClass(
                              bus.surge_probability
                            )}`}
                          >
                            {surgeLabel(bus.surge_probability)} demand
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-foreground">
                          {bus.origin} {"->"} {bus.destination}
                        </h2>
                      </div>
                      <p className="shrink-0 text-right text-lg font-bold text-brand-blue">
                        PHP {estimateFare(bus)}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm min-[420px]:grid-cols-2">
                      <div className="rounded-xl bg-white/50 p-3 dark:bg-slate-900/40">
                        <p className="text-xs text-slate-400">Departure</p>
                        <p className="mt-1 flex items-center gap-1.5 font-semibold text-foreground">
                          <Clock className="h-4 w-4 text-brand-blue" />
                          Today window
                        </p>
                      </div>
                      <div className="rounded-xl bg-white/50 p-3 dark:bg-slate-900/40">
                        <p className="text-xs text-slate-400">Terminal bus</p>
                        <p className="mt-1 flex items-center gap-1.5 font-semibold text-foreground">
                          <BusFront className="h-4 w-4 text-brand-orange" />
                          {bus.plate_number}
                        </p>
                      </div>
                    </div>

                    <CapacityMeter
                      booked={booked}
                      capacity={bus.capacity}
                      label={`${bus.available_seats} seats available`}
                      className="mt-5"
                    />

                    <div className="mt-auto pt-5">
                      <button
                        type="button"
                        disabled={isFull}
                        onClick={() => handleBook(bus)}
                        className={`${glassStyles.primaryButton} flex min-h-11 w-full items-center justify-center gap-2 text-sm font-bold disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-700`}
                      >
                        <MapPin className="h-4 w-4" aria-hidden />
                        {isFull ? "Bus Full" : "Continue to Preferences"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            !error && (
              <div className={`${glassStyles.panel} py-12 text-center`}>
                <MapPin className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                <p className="font-semibold text-foreground">No buses found</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
