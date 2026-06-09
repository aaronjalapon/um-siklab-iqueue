"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Filter, MapPin, Search } from "lucide-react";
import { searchBuses } from "@/lib/api";
import type { Bus } from "@/lib/types";
import Link from "next/link";

const QUICK_ROUTES = [
  { origin: "Davao City", destination: "Cagayan de Oro", label: "Davao → CDO" },
  { origin: "Davao City", destination: "General Santos", label: "Davao → GenSan" },
  { origin: "Davao City", destination: "Cotabato City", label: "Davao → Cotabato" },
  { origin: "Cagayan de Oro", destination: "Iligan City", label: "CDO → Iligan" },
];

function BuyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [origin, setOrigin] = useState(searchParams.get("origin") || "");
  const [destination, setDestination] = useState(
    searchParams.get("destination") || ""
  );
  const [travelDate, setTravelDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!origin.trim() || !destination.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await searchBuses(origin.trim(), destination.trim(), travelDate);
      setBuses(data.buses);
      if (data.buses.length === 0) {
        setError("No buses found for this route and date. Try another search.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to search buses. Please try again.");
      setBuses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoute = (o: string, d: string) => {
    setOrigin(o);
    setDestination(d);
    // Auto-search after a brief delay for state to update
    setTimeout(() => {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      searchBuses(o, d, travelDate)
        .then((data) => {
          setBuses(data.buses);
          if (data.buses.length === 0) {
            setError("No buses found for this route and date. Try another search.");
          }
        })
        .catch((err: any) => {
          setError(err.message || "Failed to search buses.");
          setBuses([]);
        })
        .finally(() => setLoading(false));
    }, 0);
  };

  const handleBook = (bus: Bus) => {
    router.push(
      `/book/${bus.id}?date=${encodeURIComponent(travelDate)}&origin=${encodeURIComponent(bus.origin)}&dest=${encodeURIComponent(bus.destination)}`
    );
  };

  const surgeBadge = (prob: number | null) => {
    if (prob === null) return null;
    if (prob >= 0.7) {
      return (
        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
          High Demand
        </span>
      );
    }
    if (prob >= 0.4) {
      return (
        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
          Moderate
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
        Normal
      </span>
    );
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-24 animate-in fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 px-4 md:px-8 pt-6 pb-6 md:pb-8 rounded-b-3xl md:rounded-b-[40px] shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <Link
            href="/home"
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-900 dark:text-white" />
          </Link>
          <h1 className="font-bold text-lg md:text-2xl text-slate-900 dark:text-white">
            Find Your Bus
          </h1>
          <div className="w-9" /> {/* Spacer */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
          <div className="relative flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:border-brand-blue/50 transition-colors">
            <div className="w-3 h-3 rounded-full border-2 border-green-500 mr-3 shrink-0" />
            <input
              type="text"
              placeholder="Origin city"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="bg-transparent border-none outline-none w-full text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
          <div className="relative flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:border-brand-blue/50 transition-colors">
            <div className="w-3 h-3 rounded-full border-2 border-brand-orange mr-3 shrink-0" />
            <input
              type="text"
              placeholder="Destination city"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="bg-transparent border-none outline-none w-full text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
          <div className="relative flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:border-brand-blue/50 transition-colors">
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm font-medium text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="max-w-3xl mx-auto flex justify-end mt-4">
          <button
            onClick={handleSearch}
            disabled={loading || !origin.trim() || !destination.trim()}
            className="w-full md:w-auto md:min-w-[200px] bg-brand-blue text-white font-bold py-3.5 md:py-4 px-8 rounded-xl shadow-md shadow-brand-blue/20 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>Searching...</>
            ) : (
              <>
                <Search className="w-4 h-4" /> Search Tickets
              </>
            )}
          </button>
        </div>

        {/* Quick Routes */}
        <div className="max-w-3xl mx-auto mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-slate-400 self-center mr-1">Quick:</span>
          {QUICK_ROUTES.map((qr, i) => (
            <button
              key={i}
              onClick={() => handleQuickRoute(qr.origin, qr.destination)}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-blue hover:text-white transition-colors"
            >
              {qr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-5xl mx-auto">
        {hasSearched && !loading && (
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <span className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
              {buses.length} {buses.length === 1 ? "Bus" : "Buses"} Found
            </span>
            {buses.length > 0 && (
              <button className="flex items-center gap-2 text-sm md:text-base font-semibold text-brand-blue hover:text-blue-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                <Filter className="w-4 h-4 md:w-5 md:h-5" /> Filter
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <p className="text-slate-400 animate-pulse">Searching available buses...</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {buses.map((bus) => (
            <div
              key={bus.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-700 transition-shadow"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] md:text-xs font-bold rounded">
                    {bus.plate_number}
                  </span>
                  {surgeBadge(bus.surge_probability)}
                </div>
                <span className="font-bold text-brand-blue text-sm md:text-base">
                  PHP {Math.round(200 + (bus.surge_probability ?? 0) * 150)}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-green-500" />
                  <div className="w-0.5 h-8 md:h-10 bg-slate-200 dark:bg-slate-700" />
                  <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-brand-orange" />
                </div>
                <div className="flex-1 space-y-5 md:space-y-7">
                  <div>
                    <p className="text-xs md:text-sm text-slate-500">Depart</p>
                    <p className="font-bold text-sm md:text-base text-slate-900 dark:text-white">
                      {bus.origin}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-slate-500">Arrive</p>
                    <p className="font-bold text-sm md:text-base text-slate-900 dark:text-white">
                      {bus.destination}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                {bus.available_seats} of {bus.capacity} seats available
              </div>

              <div className="mt-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    bus.available_seats / bus.capacity > 0.5
                      ? "bg-green-500"
                      : bus.available_seats > 0
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.round(
                      ((bus.capacity - bus.available_seats) / bus.capacity) * 100
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-brand-blue">
                    <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <span className="text-sm md:text-base font-semibold text-slate-900 dark:text-white">
                    {bus.plate_number}
                  </span>
                </div>
                <button
                  disabled={bus.available_seats === 0}
                  onClick={() => handleBook(bus)}
                  className="px-5 py-2.5 bg-brand-blue hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm md:text-base font-bold rounded-lg shadow-sm transition-colors"
                >
                  {bus.available_seats > 0 ? "Book Now" : "Full"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {hasSearched && !loading && buses.length === 0 && !error && (
          <div className="text-center py-12 text-slate-400">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No buses found for this route</p>
            <p className="text-sm mt-1">Try a different origin, destination, or date.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuyPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-slate-400">Loading...</div>
      }
    >
      <BuyPageInner />
    </Suspense>
  );
}
