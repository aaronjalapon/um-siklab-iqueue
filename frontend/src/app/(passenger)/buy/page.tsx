"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
import { BookingProgress } from "@/components/ui/BookingProgress";
import { searchBuses } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { calculateFlexibleDepartureTime } from "@/lib/departure-time";
import { uiStyles } from "@/lib/design-system";
import { getLocalDateInputValue, isPastLocalDate } from "@/lib/local-date";
import type { Bus } from "@/lib/types";
import { formatDate, surgeColorClass, surgeLabel } from "@/lib/utils";
import {
  getSessionBookedSeatsForBus,
  getSessionBookedSeatsForRoute,
} from "@/lib/session-bookings";

const QUICK_ROUTES = [
  { origin: "Pasay", destination: "Baguio", label: "Pasay -> Baguio" },
  { origin: "Cubao", destination: "San Fernando City", label: "Cubao -> San Fernando City" },
  { origin: "Panglao", destination: "Tagbilaran", label: "Panglao -> Tagbilaran" },
  { origin: "Tagbilaran", destination: "Jagna", label: "Tagbilaran -> Jagna" },
  { origin: "Davao", destination: "Cagayan", label: "Davao -> Cagayan" },
  { origin: "Davao", destination: "General Santos", label: "Davao -> General Santos" },
];

type SortMode = "recommended" | "seats" | "surge" | "price";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const ROUTE_BASE_FARES: Record<string, number> = {
  // Revised corridors
  "pasay->baguio": 650,
  "baguio->pasay": 650,
  "cubao->san fernando city": 580,
  "san fernando city->cubao": 580,
  "panglao->tagbilaran": 150,
  "tagbilaran->panglao": 150,
  "tagbilaran->jagna": 180,
  "jagna->tagbilaran": 180,
  "davao->cagayan": 670,
  "cagayan->davao": 670,
  "davao->general santos": 540,
  "general santos->davao": 540,
  // Manila corridors
  "manila->baguio city": 650,
  "baguio city->manila": 650,
  "manila->batangas city": 280,
  "batangas city->manila": 280,
  // Cebu corridors
  "cebu->tacloban city": 600,
  "tacloban city->cebu": 600,
  "cebu->bacolod city": 420,
  "bacolod city->cebu": 420,
  // Davao corridors
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
      (orig.includes("pasay") && dest.includes("baguio")) ||
      (orig.includes("baguio") && dest.includes("pasay"))
    ) {
      baseFare = 650;
    } else if (
      (orig.includes("cubao") && dest.includes("san fernando")) ||
      (orig.includes("san fernando") && dest.includes("cubao"))
    ) {
      baseFare = 580;
    } else if (
      (orig.includes("panglao") && dest.includes("tagbilaran")) ||
      (orig.includes("tagbilaran") && dest.includes("panglao"))
    ) {
      baseFare = 150;
    } else if (
      (orig.includes("tagbilaran") && dest.includes("jagna")) ||
      (orig.includes("jagna") && dest.includes("tagbilaran"))
    ) {
      baseFare = 180;
    } else if (
      (orig.includes("manila") && dest.includes("baguio")) ||
      (orig.includes("baguio") && dest.includes("manila"))
    ) {
      baseFare = 650;
    } else if (
      (orig.includes("manila") && dest.includes("batangas")) ||
      (orig.includes("batangas") && dest.includes("manila"))
    ) {
      baseFare = 280;
    } else if (
      (orig.includes("cebu") && dest.includes("tacloban")) ||
      (orig.includes("tacloban") && dest.includes("cebu"))
    ) {
      baseFare = 600;
    } else if (
      (orig.includes("cebu") && dest.includes("bacolod")) ||
      (orig.includes("bacolod") && dest.includes("cebu"))
    ) {
      baseFare = 420;
    } else if (
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
          className={`${uiStyles.surface} min-h-[150px] p-3.5 sm:p-5 animate-pulse motion-reduce:animate-none flex flex-col justify-between`}
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
    searchParams.get("date") || getLocalDateInputValue()
  );
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("recommended");
  const [sessionTick, setSessionTick] = useState(0);

  useEffect(() => {
    function handleStorage() {
      setSessionTick((t) => t + 1);
    }
    window.addEventListener("focus", handleStorage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("focus", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const getEffectiveSeats = useCallback(
    (bus: Bus) => {
      void sessionTick;
      const sessionBooked =
        getSessionBookedSeatsForBus(bus.id) ||
        getSessionBookedSeatsForRoute(bus.origin, bus.destination);
      const isJagna =
        bus.origin.toLowerCase().includes("tagbilaran") &&
        bus.destination.toLowerCase().includes("jagna");
      const baseSeats = isJagna
        ? bus.capacity >= 45 || bus.plate_number === "BOH-003"
          ? 0
          : 1
        : bus.available_seats;
      return Math.max(0, baseSeats - sessionBooked);
    },
    [sessionTick]
  );

  const minimumDate = getLocalDateInputValue();
  const dateIsPast = isPastLocalDate(travelDate, minimumDate);
  const canSearch = origin.trim().length > 0 && destination.trim().length > 0 && !dateIsPast;

  const sortedBuses = useMemo(() => {
    const list = [...buses];

    list.sort((a, b) => {
      const aSeats = getEffectiveSeats(a);
      const bSeats = getEffectiveSeats(b);
      if (sortMode === "seats") return bSeats - aSeats;
      if (sortMode === "surge") {
        return (b.surge_probability ?? 0) - (a.surge_probability ?? 0);
      }
      if (sortMode === "price") return estimateFare(a) - estimateFare(b);

      const scoreA =
        aSeats * 2 - Math.round((a.surge_probability ?? 0) * 20);
      const scoreB =
        bSeats * 2 - Math.round((b.surge_probability ?? 0) * 20);
      return scoreB - scoreA;
    });

    return list;
  }, [buses, getEffectiveSeats, sortMode]);

  async function performSearch(
    searchOrigin = origin,
    searchDestination = destination,
    searchDate = travelDate
  ) {
    const trimmedOrigin = searchOrigin.trim();
    const trimmedDestination = searchDestination.trim();
    if (!trimmedOrigin || !trimmedDestination) return;
    if (isPastLocalDate(searchDate)) {
      setError("Cannot book past dates. Please choose today or a future date.");
      setHasSearched(false);
      return;
    }

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

  useEffect(() => {
    const qOrigin = searchParams.get("origin");
    const qDest = searchParams.get("destination") || searchParams.get("dest");
    if (qOrigin && qDest) {
      const timer = setTimeout(() => {
        void performSearch(qOrigin, qDest, travelDate);
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleQuickRoute(routeOrigin: string, routeDestination: string) {
    setOrigin(routeOrigin);
    setDestination(routeDestination);
    void performSearch(routeOrigin, routeDestination, travelDate);
  }

  function buildPreferencesHref(bus: Bus, index: number): string {
    const depTime = bus.departure_time || calculateFlexibleDepartureTime(index);
    const params = new URLSearchParams({
      origin: origin.trim(),
      destination: destination.trim(),
      travel_date: travelDate,
      plate: bus.plate_number,
      capacity: String(bus.capacity),
      fare: String(estimateFare(bus)),
      departure_time: depTime,
    });

    return `/book/${bus.id}/preferences?${params.toString()}`;
  }

  const routeSummary =
    hasSearched && canSearch
      ? `${origin.trim()} -> ${destination.trim()} on ${formatDate(travelDate)}`
      : `Search available inter-provincial buses and let ${BRAND.name} pick your best seat.`;

  return (
    <div className={`${uiStyles.pageContainer} max-w-6xl !space-y-2.5 sm:!space-y-5 !px-3 sm:!px-6 !py-2 sm:!py-6`}>
      <div className="hidden md:flex items-center justify-between">
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-ui-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          Back home
        </Link>
      </div>

      <BookingProgress current="search" />

      <header className="min-w-0">
        <p className="text-[9px] sm:text-xs font-bold uppercase tracking-[0.16em] text-ui-primary">
          Passenger booking
        </p>
        <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-ui-foreground tracking-tight">
          Find Your Bus
        </h1>
        <p className="mt-0.5 text-[11px] sm:text-sm text-ui-muted-foreground">
          {routeSummary}
        </p>
      </header>

      {/* Filter / Search Card — Compact and scaled down for phones */}
      <section className={`${uiStyles.surface} p-3 sm:p-5 rounded-2xl sm:rounded-3xl`} aria-labelledby="route-search-title">
        <h2 id="route-search-title" className="sr-only">Search routes</h2>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-[1fr_1fr_180px]">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="origin-city"
              className="text-xs sm:text-sm font-semibold text-ui-foreground select-none"
            >
              Origin
            </label>
            <input
              id="origin-city"
              type="text"
              placeholder="e.g. Pasay or Davao"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void performSearch()}
              className="clay-control block min-h-[42px] sm:min-h-11 w-full rounded-xl border border-ui-border bg-ui-surface px-3 py-2 text-sm sm:text-base text-ui-foreground outline-none placeholder:text-ui-muted-foreground focus:border-ui-primary focus:ring-2 focus:ring-ui-primary/20 disabled:cursor-not-allowed disabled:bg-ui-muted disabled:text-ui-muted-foreground"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="destination-city"
              className="text-xs sm:text-sm font-semibold text-ui-foreground select-none"
            >
              Destination
            </label>
            <input
              id="destination-city"
              type="text"
              placeholder="e.g. Baguio or Cagayan"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void performSearch()}
              className="clay-control block min-h-[42px] sm:min-h-11 w-full rounded-xl border border-ui-border bg-ui-surface px-3 py-2 text-sm sm:text-base text-ui-foreground outline-none placeholder:text-ui-muted-foreground focus:border-ui-primary focus:ring-2 focus:ring-ui-primary/20 disabled:cursor-not-allowed disabled:bg-ui-muted disabled:text-ui-muted-foreground"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2 md:col-span-1">
            <label
              htmlFor="travel-date"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-ui-foreground select-none"
            >
              <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-ui-muted-foreground" aria-hidden />
              <span>Travel date</span>
            </label>
            <input
              id="travel-date"
              type="date"
              ref={(element) => {
                if (element) element.min = getLocalDateInputValue();
              }}
              value={travelDate}
              onChange={(e) => {
                const val = e.target.value;
                setTravelDate(val);
                if (isPastLocalDate(val)) {
                  setError("Cannot book past dates. Please choose today or a future date.");
                } else if (error === "Cannot book past dates. Please choose today or a future date.") {
                  setError(null);
                }
              }}
              min={minimumDate}
              aria-invalid={dateIsPast}
              aria-describedby={dateIsPast ? "travel-date-error" : undefined}
              className={`clay-control block min-h-[42px] sm:min-h-11 w-full rounded-xl border ${
                dateIsPast
                  ? "border-ui-danger focus:border-ui-danger focus:ring-2 focus:ring-ui-danger/20"
                  : "border-ui-border focus:border-ui-primary focus:ring-2 focus:ring-ui-primary/20"
              } bg-ui-surface px-3 py-2 text-sm sm:text-base text-ui-foreground outline-none placeholder:text-ui-muted-foreground disabled:cursor-not-allowed disabled:bg-ui-muted disabled:text-ui-muted-foreground`}
            />
            {dateIsPast && (
              <span id="travel-date-error" role="alert" className="block text-xs sm:text-sm font-medium text-ui-danger">
                Cannot book past dates. Choose today or a future date.
              </span>
            )}
          </div>
        </div>

        {/* Quick Routes + Search Action Row */}
        <div className="mt-2 sm:mt-3 flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-ui-muted-foreground sm:hidden"><span>Quick routes</span><span aria-hidden>Scroll →</span></div>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 -my-1 pr-8 whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pr-0 sm:py-0 sm:my-0">
            <span className="mr-0.5 hidden shrink-0 text-xs font-bold uppercase tracking-wider text-ui-muted-foreground sm:inline">
              Quick routes
            </span>
            {QUICK_ROUTES.map((route) => {
              const isSelected =
                origin.toLowerCase().trim() === route.origin.toLowerCase().trim() &&
                destination.toLowerCase().trim() === route.destination.toLowerCase().trim();
              return (
                <button
                  key={route.label}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleQuickRoute(route.origin, route.destination)}
                  className={`min-h-[30px] sm:min-h-9 shrink-0 rounded-full border px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-medium sm:font-semibold select-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/30 dark:border-blue-500 dark:bg-blue-600 dark:text-white"
                      : "border-ui-border bg-ui-surface text-ui-muted-foreground hover:border-ui-primary/50 hover:bg-ui-surface hover:text-ui-foreground dark:border-white/15 dark:bg-white/[0.04] dark:hover:bg-white/10"
                  }`}
                >
                  {route.label}
                </button>
              );
            })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void performSearch()}
            disabled={loading || !canSearch}
            className={`${uiStyles.primaryButton} inline-flex min-h-[36px] sm:min-h-11 items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold w-full lg:w-auto shrink-0 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            {loading ? "Searching..." : "Search Tickets"}
          </button>
        </div>
      </section>

      {hasSearched && (
        <section className="space-y-2.5 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs sm:text-base font-bold text-ui-foreground">
                {loading
                  ? "Checking available buses..."
                  : `${buses.length} ${buses.length === 1 ? "bus" : "buses"} found`}
              </p>
              <p className="text-[11px] sm:text-xs text-ui-muted-foreground truncate max-w-[180px] sm:max-w-none">
                {origin.trim()} {"->"} {destination.trim()}
              </p>
            </div>

            {buses.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <ListFilter className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" aria-hidden />
                <label htmlFor="sort-results" className="sr-only">Sort results</label>
                <select id="sort-results" aria-label="Sort results"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="clay-control min-h-[32px] sm:min-h-11 rounded-lg sm:rounded-xl border border-ui-border bg-ui-surface px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-semibold text-ui-foreground outline-none focus:border-ui-primary focus:ring-2 focus:ring-ui-primary/20"
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
            <div className="flex items-start gap-2 rounded-xl sm:rounded-2xl border border-amber-200 bg-amber-50 p-2.5 sm:p-4 text-xs sm:text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden />
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
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 sm:gap-4">
              {sortedBuses.map((bus, index) => {
                const effectiveAvailableSeats = getEffectiveSeats(bus);
                const booked = bus.capacity - effectiveAvailableSeats;
                const isFull = effectiveAvailableSeats <= 0;
                const departureTime =
                  bus.departure_time || calculateFlexibleDepartureTime(index);

                return (
                  <article
                    key={bus.id}
                    className={`${uiStyles.surface} clay-interactive route-motif relative flex flex-col justify-between p-3 sm:p-5 hover:border-ui-primary/45 rounded-xl sm:rounded-2xl`}
                  >
                    {/* Top Row: Badges, Route & Price */}
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1 sm:gap-1.5">
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {bus.plate_number}
                          </span>
                          <span className="rounded-md bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/40 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-ui-primary dark:text-blue-300">
                            {bus.capacity >= 45 ? "Regular Aircon Bus" : "Express Mini Bus"}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold ${surgeColorClass(
                              bus.surge_probability
                            )}`}
                          >
                            {surgeLabel(bus.surge_probability)} demand
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden />
                            <span>Departs {departureTime}</span>
                          </span>
                        </div>
                        <h2 className="truncate text-sm sm:text-lg font-bold text-ui-foreground">
                          {bus.origin} <span className="text-ui-primary font-semibold">→</span> {bus.destination}
                        </h2>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-base sm:text-xl font-extrabold text-ui-primary leading-tight">
                          PHP {estimateFare(bus)}
                        </p>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">per seat</span>
                      </div>
                    </div>

                    {/* Middle strip: Capacity & Accessibility */}
                    <div className="mt-2 pt-2 border-t border-ui-border/60 flex flex-wrap items-center justify-between gap-1.5 text-[11px] sm:text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {effectiveAvailableSeats === 1 ? (
                          <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                            <BusFront className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 shrink-0" />
                            <span className="truncate">Only 1 seat left</span>
                          </span>
                        ) : effectiveAvailableSeats === 0 ? (
                          <span className="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
                            <BusFront className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">0 of {bus.capacity} seats left</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                            <BusFront className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-brand-orange shrink-0" />
                            <span className="truncate">{effectiveAvailableSeats} of {bus.capacity} seats left</span>
                          </span>
                        )}
                        {/* Inline mini capacity bar */}
                        <div className="hidden xs:block h-1.5 w-14 sm:w-20 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
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

                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 rounded-lg px-1.5 py-0.5">
                        <Accessibility className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                        <span>{bus.accessibility_available_count} priority seats</span>
                      </div>
                    </div>

                    {/* Bottom Row: Compact action button */}
                    <div className="mt-2.5">
                      {isFull ? (
                        <span
                          className="flex min-h-[34px] sm:min-h-10 w-full items-center justify-center gap-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold bg-slate-200/80 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500 cursor-not-allowed border border-transparent select-none"
                          aria-disabled="true"
                        >
                          <MapPin className="h-3 w-3" aria-hidden />
                          Bus Full
                        </span>
                      ) : (
                        <Link
                          href={buildPreferencesHref(bus, index)}
                          prefetch={false}
                          className={`${uiStyles.successButton} flex min-h-[34px] sm:min-h-10 w-full items-center justify-center gap-1.5 text-xs sm:text-sm font-bold group active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-lg sm:rounded-xl py-1 sm:py-2`}
                        >
                          <span>Continue to Preferences</span>
                          <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            !error && (
              <div className={`${uiStyles.surface} py-8 text-center`}>
                <MapPin className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                <p className="font-semibold text-ui-foreground text-sm sm:text-base">No buses found</p>
                <p className="mt-1 text-xs sm:text-sm text-ui-muted-foreground">
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
        <div className={`${uiStyles.pageContainer} max-w-6xl`}>
          <div className={`${uiStyles.skeleton} h-32`} />
          <BusResultSkeleton />
        </div>
      }
    >
      <BuyPageInner />
    </Suspense>
  );
}
