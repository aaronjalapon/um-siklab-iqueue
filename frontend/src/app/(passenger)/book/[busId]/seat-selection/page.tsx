"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { Accessibility, ArrowLeft, Check, Star, RefreshCw } from "lucide-react";
import { createBooking, createPassenger } from "@/lib/api";
import { saveBoardingPass } from "@/lib/boarding-passes";
import { BusSeatGrid } from "@/components/seats/BusSeatGrid";
import { SeatLegend } from "@/components/seats/SeatLegend";
import { BookingProgress } from "@/components/ui/BookingProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSeatMap } from "@/hooks/useSeatMap";
import { BRAND } from "@/lib/brand";
import { uiStyles } from "@/lib/design-system";
import { isPastLocalDate, toServiceDepartureIso } from "@/lib/local-date";
import { DEMO_TENANT_ID } from "@/lib/demo-config";
import type { SeatMapEntry, SeatAssignmentResult } from "@/types/seat";
import type { PassengerContext } from "@/types/seat";
import { GroupSeatSelectionFlow } from "@/components/booking/GroupSeatSelectionFlow";

export default function SeatSelectionPage() {
  const { busId } = useParams<{ busId: string }>();
  const params = useSearchParams();
  const draftId = params.get("draft");
  if (draftId) {
    return (
      <GroupSeatSelectionFlow
        busId={busId}
        draftId={draftId}
        date={params.get("date") || ""}
        origin={params.get("origin") || ""}
        destination={params.get("dest") || ""}
      />
    );
  }
  return <SingleSeatSelectionFlow />;
}

function SingleSeatSelectionFlow() {
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
  const affinityOptIn = params.get("affinity_opt_in") === "true";
  const accessibilityNeeds = params.get("accessibility_needs") === "true";
  const preferredSeatType = params.get("preferred_seat_type") || "";
  const preferredSide = params.get("preferred_side") || "";

  const { seats, loading, error, assignSeat } = useSeatMap(busId, date);

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
      affinity_opt_in: affinityOptIn,
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
      affinityOptIn,
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
      const result = await assignSeat(ctx, seat.seat_label);
      setAutoAssigned(result);
    } catch {
      // Keep the visible manual selection if the recommendation API is unavailable.
    }
  }

  const handleConfirm = async () => {
    if (isPastLocalDate(date)) {
      setSubmitError("Travel date cannot be in the past. Return to search and choose a valid date.");
      return;
    }
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
        tenant_id: DEMO_TENANT_ID,
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
        departure_date: toServiceDepartureIso(date),
        seat_preference: preferredSeatType || undefined,
        selected_seat: selectedSeatLabel,
        passenger_name: name,
        language_preference: languagePref,
        travel_habit: travelHabits || undefined,
        lifestyle_interest: lifestyleInterests || undefined,
        affinity_opt_in: affinityOptIn,
        needs_accessibility: accessibilityNeeds,
        preferred_side: preferredSide || undefined,
      });
      saveBoardingPass({
        ...booking,
        passenger_name: name || null,
        route_origin: null,
        route_destination: null,
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
      <div className={`${uiStyles.pageContainer} max-w-7xl`}>
        <BookingProgress current="seat" />
        <PageHeader
          eyebrow="Explainable seat allocator"
          title="Finding Your Best Seat"
          description="Loading the seat map and applying your preferences before anything is shown."
        />
        <div className={`${uiStyles.surface} p-3 sm:p-6`}>
          <div className="space-y-1.5 sm:space-y-2 max-w-xs mx-auto">
            {Array.from({ length: 6 }).map((_, ri) => (
              <div key={ri} className="flex justify-center gap-1.5 sm:gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: 2 }).map((_, ci) => (
                    <div
                      key={ci}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-slate-200 dark:bg-slate-800 animate-pulse"
                    />
                  ))}
                </div>
                <div className="w-4 sm:w-6" />
                <div className="flex gap-1">
                  {Array.from({ length: 2 }).map((_, ci) => (
                    <div
                      key={ci}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-slate-200 dark:bg-slate-800 animate-pulse"
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
      <div className="text-center py-8 sm:py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 sm:p-6 max-w-md mx-auto text-xs sm:text-sm">
          <p className="font-semibold text-sm sm:text-base">Could not load seat map</p>
          <p className="mt-1">{error}</p>
          <Link
            href={`/buy?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&date=${date}`}
            prefetch={false}
            className="text-blue-600 hover:underline mt-3 inline-block font-semibold"
          >
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${uiStyles.pageContainer} max-w-7xl`}>
      {/* Breadcrumb */}
      <Link
        href={`/book/${busId}/preferences?${new URLSearchParams({ date, origin, dest })}`}
        prefetch={false}
        className="text-xs sm:text-sm text-ui-primary hover:underline inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Back to preferences
      </Link>

      <BookingProgress current="seat" />

      <PageHeader
        eyebrow="Seat assignment"
        title="Select Your Seat"
        description={`${origin || "Origin"} → ${dest || "Destination"}${date ? ` · ${date}` : ""}`}
      />

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-xs sm:text-sm">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 relative items-start">
        {/* Seat Grid */}
        <div className={`lg:col-span-2 ${uiStyles.elevatedSurface} p-2.5 sm:p-5 md:p-6`}>
          <div className="mb-3 sm:mb-4 flex items-start gap-2.5 sm:gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <Accessibility className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <p className="leading-snug sm:leading-normal">
              {accessibilityNeeds
                ? "Accessibility-priority seats are highlighted near the front door."
                : "Front priority seats are held for passengers who need easier access while other seats are available."}
            </p>
          </div>
          <BusSeatGrid
            seats={seats}
            autoAssignedSeatId={autoAssigned?.seat_id}
            selectedSeatId={manualMode ? selectedSeatId : undefined}
            onSeatSelect={handleManualSelect}
            needsAccessibility={accessibilityNeeds}
          />
          <div className="mt-3 sm:mt-4">
            <SeatLegend variant="passenger" />
          </div>
        </div>

        {/* Confirmation Card */}
        <div className={`${uiStyles.elevatedSurface} p-3 sm:p-5 md:p-6 space-y-3 sm:space-y-4`}>
          <h2 className="font-semibold text-base sm:text-lg">Your Seat</h2>

          {autoAssigned && !manualMode && (
            <div className="clay-surface-low space-y-1.5 rounded-xl border border-green-200 bg-green-50 p-3 sm:space-y-2 sm:p-4 dark:border-green-900 dark:bg-green-950">
              <div className="flex items-center gap-1.5 text-green-800 sm:gap-2 dark:text-green-200">
                <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm font-semibold">{BRAND.name} Recommended</span>
              </div>
              <p className="text-xl font-bold text-green-950 sm:text-2xl dark:text-green-100">
                Seat {autoAssigned.seat_label}
              </p>
              <p className="text-xs capitalize text-green-800 sm:text-sm dark:text-green-200">
                {autoAssigned.seat_type} · {autoAssigned.side} side
              </p>
              {autoAssigned.is_accessibility && (
                <p className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-green-800 sm:py-1 sm:text-xs dark:border-green-800 dark:bg-green-950">
                  <Accessibility className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                  Accessibility-priority seat
                </p>
              )}
              {autoAssigned.affinity_score > 0 && (
                <p className="text-xs text-green-800 sm:text-sm dark:text-green-200">
                  Decision score: {autoAssigned.affinity_score.toFixed(0)}
                </p>
              )}
              {autoAssigned.assignment_reasons.length > 0 && (
                <ul className="space-y-0.5 text-[11px] text-green-800 sm:space-y-1 sm:text-xs dark:text-green-200">
                  {autoAssigned.assignment_reasons.map((reason) => (
                    <li key={reason}>• {reason}</li>
                  ))}
                </ul>
              )}
              {autoAssigned.boarding_window && (
                <p className="text-[10px] text-green-800 sm:text-xs dark:text-green-200">
                  Boarding: {autoAssigned.boarding_window}
                </p>
              )}
            </div>
          )}

          {manualMode && selectedSeatId && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg sm:rounded-xl p-2.5 sm:p-3 text-xs sm:text-sm space-y-2">
              <p className="font-semibold text-amber-800">
                Manually selected seat {activeSeatLabel ? ` ${activeSeatLabel}` : ""}
              </p>
              <button
                type="button"
                onClick={() => {
                  setManualMode(false);
                  if (autoAssigned) setSelectedSeatId(autoAssigned.seat_id);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white border border-amber-300 text-amber-700 rounded-md text-xs font-medium hover:bg-amber-100 hover:border-amber-400 transition active:scale-95"
              >
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Reset to {BRAND.name} pick
              </button>
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`${uiStyles.primaryButton} w-full min-h-11 sm:min-h-12 py-2 sm:py-2.5 text-xs sm:text-sm disabled:cursor-not-allowed disabled:opacity-50`}
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
                className="w-full text-xs sm:text-sm text-blue-600 hover:underline py-1"
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
