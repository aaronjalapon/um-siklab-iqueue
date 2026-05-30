"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { searchBuses } from "@/lib/api";
import { formatDate, surgeColorClass, surgeLabel } from "@/lib/utils";
import type { Bus } from "@/lib/types";
import { ArrowLeft, Bus as BusIcon } from "lucide-react";
import Link from "next/link";

function ResultsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const origin = params.get("origin") || "";
  const destination = params.get("destination") || "";
  const date = params.get("date") || "";

  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!origin || !destination || !date) { setLoading(false); return; }
    searchBuses(origin, destination, date)
      .then((data) => setBuses(data.buses))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [origin, destination, date]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" /> Back to search
        </Link>
        <h1 className="text-2xl font-bold">{origin} → {destination}</h1>
        <p className="text-gray-500">{date && formatDate(date)}</p>
      </div>
      {loading && <div className="text-center py-12 text-gray-500">Searching for available buses...</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>}
      {!loading && buses.length === 0 && (
        <div className="text-center py-12 text-gray-500">No buses found for this route and date.</div>
      )}
      <div className="space-y-4">
        {buses.map((bus) => (
          <div key={bus.id} className="bg-white rounded-xl shadow-sm border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <BusIcon className="w-4 h-4 text-blue-600" />
                <span className="font-semibold">{bus.plate_number}</span>
                {bus.surge_probability !== null && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${surgeColorClass(bus.surge_probability)}`}>
                    Surge: {surgeLabel(bus.surge_probability)}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{bus.origin} → {bus.destination}</p>
              <p className="text-sm text-gray-500">Capacity: {bus.capacity} seats</p>
              <p className={`text-sm font-medium ${bus.available_seats < 5 ? "text-red-600" : "text-green-600"}`}>
                {bus.available_seats} seat{bus.available_seats !== 1 ? "s" : ""} available
              </p>
            </div>
            <button onClick={() => router.push(`/book/${bus.id}?date=${date}&origin=${encodeURIComponent(origin)}&dest=${encodeURIComponent(destination)}`)}
              disabled={bus.available_seats === 0}
              className="px-6 py-2.5 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition">
              {bus.available_seats === 0 ? "Full" : "Book"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
