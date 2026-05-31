"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createBooking, getSeatMap } from "@/lib/api";
import type { PassengerFormData, SeatInfo } from "@/lib/types";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

export default function BookPage() {
  const { busId } = useParams<{ busId: string }>();
  const params = useSearchParams();
  const date = params.get("date") || "";
  const origin = params.get("origin") || "";
  const dest = params.get("dest") || "";
  const router = useRouter();

  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!busId || !date) return;
    getSeatMap(busId, date)
      .then((data) => setSeats(data.seats))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [busId, date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat) return;
    setSubmitting(true); setError(null);
    try {
      const booking = await createBooking({
        passenger_id: "00000000-0000-0000-0000-000000000001",
        bus_id: busId,
        departure_date: new Date(date).toISOString(),
        seat_preference: selectedSeat,
      });
      router.push(`/confirmation/${booking.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading seat map...</div>;

  const rows: SeatInfo[][] = [];
  for (let i = 0; i < seats.length; i += 4) rows.push(seats.slice(i, i + 4));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Link href={`/results?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&date=${date}`}
        className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mb-2">
        <ArrowLeft className="w-3 h-3" /> Back to results
      </Link>
      <h1 className="text-2xl font-bold">Select Your Seat</h1>
      <p className="text-gray-500">{origin} → {dest} · {date}</p>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative items-start">
        <div className="lg:col-span-2 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 p-6">
          <div className="text-center mb-6"><div className="inline-block bg-gray-700 text-white text-xs px-6 py-1 rounded-full">🚌 Driver</div></div>
          <div className="space-y-2 max-w-xs mx-auto">
            {rows.map((row, ri) => (
              <div key={ri} className="flex justify-center gap-2 animate-in fade-in slide-in-from-top-4" style={{ animationDelay: `${ri * 50}ms` }}>
                <div className="flex gap-1">
                  {row.slice(0, 2).map((seat) => (
                    <button key={seat.seat_number} disabled={!seat.is_available} onClick={() => setSelectedSeat(seat.seat_number)}
                      className={`w-10 h-10 rounded text-xs font-medium transition-all duration-300 ${
                        selectedSeat === seat.seat_number ? "bg-green-600 text-white ring-2 ring-green-300 shadow-[0_0_15px_rgba(34,197,94,0.4)] transform scale-105"
                        : seat.is_available ? "bg-blue-100 hover:bg-blue-200 text-blue-800 shadow-inner" : "bg-gray-200/50 text-gray-400 cursor-not-allowed"}`}
                      title={`Seat ${seat.seat_number}`}>{seat.seat_number}</button>
                  ))}
                </div>
                <div className="w-4" />
                <div className="flex gap-1">
                  {row.slice(2, 4).map((seat) => (
                    <button key={seat.seat_number} disabled={!seat.is_available} onClick={() => setSelectedSeat(seat.seat_number)}
                      className={`w-10 h-10 rounded text-xs font-medium transition-all duration-300 ${
                        selectedSeat === seat.seat_number ? "bg-green-600 text-white ring-2 ring-green-300 shadow-[0_0_15px_rgba(34,197,94,0.4)] transform scale-105"
                        : seat.is_available ? "bg-blue-100 hover:bg-blue-200 text-blue-800 shadow-inner" : "bg-gray-200/50 text-gray-400 cursor-not-allowed"}`}
                      title={`Seat ${seat.seat_number}`}>{seat.seat_number}</button>
                  ))}
                </div>
              </div>
            ))}
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-6 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-4 h-4 bg-blue-100 shadow-inner rounded" /> Available</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 bg-gray-200/50 rounded" /> Occupied</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 bg-green-600 shadow-[0_0_10px_rgba(34,197,94,0.4)] rounded" /> Selected</span>
          </div>
        </div>
        <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 p-6 lg:sticky lg:top-24">
          <h2 className="font-semibold text-lg mb-4">Booking Details</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {selectedSeat && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <span className="font-medium">Selected:</span> Seat {selectedSeat}
              </div>
            )}
            <button type="submit" disabled={!selectedSeat || submitting}
              className="w-full bg-blue-700 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
              {submitting ? "Booking..." : <><Check className="w-4 h-4" /> Confirm Booking</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
