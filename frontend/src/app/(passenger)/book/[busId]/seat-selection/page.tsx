"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Star, RefreshCw } from "lucide-react";
import { createBooking } from "@/lib/api";
import { BusSeatGrid } from "@/components/seats/BusSeatGrid";
import { SeatLegend } from "@/components/seats/SeatLegend";
import { useSeatMap } from "@/hooks/useSeatMap";
import type { SeatMapEntry, SeatAssignmentResult } from "@/types/seat";
import type { PassengerContext } from "@/types/seat";

export default function SeatSelectionPage() {
  const { busId } = useParams<{ busId: string }>();
  const params = useSearchParams();
  const router = useRouter();

  // Read params
  const date = params.get("date") || "";
  const origin = params.get("origin") || "";
  const dest = params.get("dest") || "";
  const name = params.get("name") || "Passenger";
  const phone = params.get("phone") || "";
  const languagePref = params.get("language_pref") || "en";
  const travelHabits = params.get("travel_habits") || "";
  const lifestyleInterests = params.get("lifestyle_interests") || "";
  const accessibilityNeeds = params.get("accessibility_needs") === "true";
  const preferredSeatType = params.get("preferred_seat_type") || "";
  const preferredSide = params.get("preferred_side") || "";

  const { seats, loading, error, assignSeat } = useSeatMap(busId);

  const [autoAssigned, setAutoAssigned] = useState<SeatAssignmentResult | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(true);
  const [selectedSeatId, setSelectedSeatId] = useState<string | undefined>(undefined);
  const [manualMode, setManualMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const passengerContext: PassengerContext = {
    booking_id: "temp", // will be replaced by real booking ID
    passenger_name: name,
    language_preference: languagePref,
    travel_habit: travelHabits || undefined,
    lifestyle_interest: lifestyleInterests || undefined,
    needs_accessibility: accessibilityNeeds,
    preferred_seat_type: (preferredSeatType || undefined) as
      | "window"
      | "aisle"
      | undefined,
    preferred_side: (preferredSide || undefined) as
      | "left"
      | "right"
      | undefined,
  };

  // Auto-assign on mount
  useEffect(() => {
    if (!busId || seats.length === 0) return;
    let cancelled = false;

    async function autoAssign() {
      setAutoAssigning(true);
      try {
        const result = await assignSeat(passengerContext);
        if (!cancelled) {
          setAutoAssigned(result);
          setSelectedSeatId(result.seat_id);
        }
      } catch {
        // Bus may be full — let user pick manually
        if (!cancelled) setManualMode(true);
      } finally {
        if (!cancelled) setAutoAssigning(false);
      }
    }

    autoAssign();
    return () => { cancelled = true; };
    // Only run on mount when seats first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId, seats.length > 0]);

  const handleManualSelect = useCallback(
    async (seat: SeatMapEntry) => {
      if (seat.status !== "available" && seat.status !== "occupied") return;
      setManualMode(true);
      setSelectedSeatId(seat.seat_id);
      // Re-assign with override
      try {
        const ctx: PassengerContext = {
          ...passengerContext,
          preferred_seat_type: seat.seat_type,
        };
        const result = await assignSeat(ctx);
        setAutoAssigned(result);
      } catch {
        // keep selected
      }
    },
    [assignSeat, passengerContext]
  );

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const booking = await createBooking({
        passenger_id: "00000000-0000-0000-0000-000000000001",
        bus_id: busId,
        departure_date: new Date(date).toISOString(),
        seat_preference: autoAssigned?.seat_label,
        passenger_name: name,
        language_preference: languagePref,
        travel_habit: travelHabits || undefined,
        lifestyle_interest: lifestyleInterests || undefined,
        needs_accessibility: accessibilityNeeds,
        preferred_side: preferredSide || undefined,
      });
      router.push(`/confirmation/${booking.id}`);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Booking failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = loading || autoAssigning;

  // Skeleton grid
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold">Finding Your Best Seat...</h1>
        <div className="bg-white/70 rounded-xl shadow-sm border p-6">
          <div className="space-y-2 max-w-xs mx-auto">
            {Array.from({ length: 6 }).map((_, ri) => (
              <div key={ri} className="flex justify-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: 2 }).map((_, ci) => (
                    <div
                      key={ci}
                      className="w-10 h-10 rounded bg-slate-200 animate-pulse"
                    />
                  ))}
                </div>
                <div className="w-6" />
                <div className="flex gap-1">
                  {Array.from({ length: 2 }).map((_, ci) => (
                    <div
                      key={ci}
                      className="w-10 h-10 rounded bg-slate-200 animate-pulse"
                      style={{ animationDelay: `${ci * 100}ms` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && seats.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 max-w-md mx-auto">
          <p className="font-semibold">Could not load seat map</p>
          <p className="text-sm mt-1">{error}</p>
          <Link
            href={`/buy?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&date=${date}`}
            className="text-blue-600 hover:underline text-sm mt-3 inline-block"
          >
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href={`/book/${busId}/preferences?${new URLSearchParams({ date, origin, dest })}`}
        className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-3 h-3" /> Back to preferences
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Select Your Seat</h1>
        <p className="text-gray-500">
          {origin} → {dest} · {date}
        </p>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative items-start">
        {/* Seat Grid */}
        <div className="lg:col-span-2 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 p-6">
          <BusSeatGrid
            seats={seats}
            autoAssignedSeatId={autoAssigned?.seat_id}
            selectedSeatId={manualMode ? selectedSeatId : undefined}
            onSeatSelect={handleManualSelect}
          />
          <div className="mt-4">
            <SeatLegend variant="passenger" />
          </div>
        </div>

        {/* Confirmation Card */}
        <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 p-6 lg:sticky lg:top-24 space-y-4">
          <h2 className="font-semibold text-lg">Your Seat</h2>

          {autoAssigned && !manualMode && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-teal-800">
                <Star className="w-5 h-5" />
                <span className="font-semibold">AI Recommended</span>
              </div>
              <p className="text-2xl font-bold text-teal-900">
                Seat {autoAssigned.seat_label}
              </p>
              <p className="text-sm text-teal-700 capitalize">
                {autoAssigned.seat_type} · {autoAssigned.side} side
              </p>
              {autoAssigned.affinity_score > 0 && (
                <p className="text-sm text-teal-700">
                  Affinity Score: {autoAssigned.affinity_score.toFixed(0)}
                </p>
              )}
              {autoAssigned.boarding_window && (
                <p className="text-xs text-teal-600">
                  Boarding: {autoAssigned.boarding_window}
                </p>
              )}
            </div>
          )}

          {manualMode && selectedSeatId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <span className="font-medium">Manually selected seat</span>
              <button
                type="button"
                onClick={() => {
                  setManualMode(false);
                  if (autoAssigned) setSelectedSeatId(autoAssigned.seat_id);
                }}
                className="ml-2 text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reset to AI pick
              </button>
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full bg-blue-700 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                "Booking..."
              ) : (
                <>
                  <Check className="w-4 h-4" /> Confirm Booking
                </>
              )}
            </button>

            {!manualMode && (
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="w-full text-sm text-blue-600 hover:underline py-1"
              >
                Choose a different seat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
