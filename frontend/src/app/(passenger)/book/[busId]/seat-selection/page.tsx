"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Star, RefreshCw } from "lucide-react";
import { createBooking, createPassenger } from "@/lib/api";
import { BusSeatGrid } from "@/components/seats/BusSeatGrid";
import { SeatLegend } from "@/components/seats/SeatLegend";
import { BookingProgress } from "@/components/ui/BookingProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSeatMap } from "@/hooks/useSeatMap";
import { glassStyles } from "@/lib/design-system";
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
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [assignmentStarted, setAssignmentStarted] = useState(false);
  const [selectedSeatId, setSelectedSeatId] = useState<string | undefined>(undefined);
  const [manualMode, setManualMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const passengerContext: PassengerContext = useMemo(
    () => ({
      booking_id: "temp",
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
    }),
    [
      accessibilityNeeds,
      languagePref,
      lifestyleInterests,
      name,
      preferredSeatType,
      preferredSide,
      travelHabits,
    ]
  );

  // Auto-assign on mount — fires once when seats first load
  const hasAutoAssigned = useRef(false);

  useEffect(() => {
    if (!busId || seats.length === 0 || hasAutoAssigned.current) return;
    hasAutoAssigned.current = true;
    setAssignmentStarted(true);

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
  }, [busId, seats.length, assignSeat, passengerContext]);

  async function handleManualSelect(seat: SeatMapEntry) {
    if (seat.status !== "available") return;
    setManualMode(true);
    setSelectedSeatId(seat.seat_id);
    try {
      const ctx: PassengerContext = {
        ...passengerContext,
        preferred_seat_type: seat.seat_type,
      };
      const result = await assignSeat(ctx);
      setAutoAssigned(result);
    } catch {
      // Keep the visible manual selection if the recommendation API is unavailable.
    }
  }

  const handleConfirm = async () => {
    const selectedSeatLabel =
      seats.find((seat) => seat.seat_id === selectedSeatId)?.seat_label ??
      autoAssigned?.seat_label;

    if (!selectedSeatLabel) {
      setSubmitError("Select an available seat before confirming.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      // Step 1: Create or find passenger in the backend
      const passenger = await createPassenger({
        tenant_id: "00000000-0000-0000-0000-000000000001",
        name,
        phone,
        language_pref: languagePref,
        travel_habits: travelHabits || undefined,
        lifestyle_interests: lifestyleInterests || undefined,
        accessibility_needs: accessibilityNeeds,
      });

      // Step 2: Create booking with the real passenger ID
      const booking = await createBooking({
        passenger_id: passenger.id,
        bus_id: busId,
        departure_date: new Date(date).toISOString(),
        seat_preference: selectedSeatLabel,
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

  const activeSeatLabel =
    seats.find((seat) => seat.seat_id === selectedSeatId)?.seat_label ??
    autoAssigned?.seat_label;
  const awaitingInitialAssignment =
    seats.length > 0 && !assignmentStarted && !manualMode && !autoAssigned;
  const isLoading = loading || autoAssigning || awaitingInitialAssignment;
  const canConfirm = Boolean(activeSeatLabel) && !submitting;

  // Skeleton grid
  if (isLoading) {
    return (
      <div className={`${glassStyles.pageContainer} max-w-7xl`}>
        <BookingProgress current="seat" />
        <PageHeader
          eyebrow="AI seat allocator"
          title="Finding Your Best Seat"
          description="Loading the seat map and applying your preferences before anything is shown."
        />
        <div className={`${glassStyles.panel} p-6`}>
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
    <div className={`${glassStyles.pageContainer} max-w-7xl`}>
      {/* Breadcrumb */}
      <Link
        href={`/book/${busId}/preferences?${new URLSearchParams({ date, origin, dest })}`}
        className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-3 h-3" /> Back to preferences
      </Link>

      <BookingProgress current="seat" />

      <PageHeader
        eyebrow="Seat assignment"
        title="Select Your Seat"
        description={`${origin || "Origin"} -> ${dest || "Destination"}${date ? ` · ${date}` : ""}`}
      />

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative items-start">
        {/* Seat Grid */}
        <div className={`lg:col-span-2 ${glassStyles.panel} p-6`}>
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
        <div className={`${glassStyles.panel} p-6 lg:sticky lg:top-24 space-y-4`}>
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
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm space-y-2">
              <p className="font-semibold text-amber-800">
                Manually selected seat {activeSeatLabel ? ` ${activeSeatLabel}` : ""}
              </p>
              <button
                type="button"
                onClick={() => {
                  setManualMode(false);
                  if (autoAssigned) setSelectedSeatId(autoAssigned.seat_id);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-md text-xs font-medium hover:bg-amber-100 hover:border-amber-400 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset to AI pick
              </button>
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
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
