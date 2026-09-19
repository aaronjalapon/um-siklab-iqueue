"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Accessibility,
  ArrowLeft,
  Check,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BusSeatGrid } from "@/components/seats/BusSeatGrid";
import { SeatLegend } from "@/components/seats/SeatLegend";
import { BookingProgress } from "@/components/ui/BookingProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import { createGroupBooking, previewGroupBooking } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { DEMO_TENANT_ID } from "@/lib/demo-config";
import { uiStyles } from "@/lib/design-system";
import { isPastLocalDate, toServiceDepartureIso } from "@/lib/local-date";
import { getGroupBookingDraft, removeGroupBookingDraft, type GroupBookingDraft } from "@/lib/group-booking-drafts";
import { saveGroupBoardingPass } from "@/lib/group-boarding-passes";
import type { GroupBookingPreview, GroupBookingRequest } from "@/lib/types";
import { formatBoardingWindow } from "@/lib/utils";
import { useSeatMap } from "@/hooks/useSeatMap";

export function GroupSeatSelectionFlow({
  busId,
  draftId,
  date,
  origin,
  destination,
  departureTime,
}: {
  busId: string;
  draftId: string;
  date: string;
  origin: string;
  destination: string;
  departureTime?: string;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<GroupBookingDraft | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
      setDraft(getGroupBookingDraft(draftId));
    });
    return () => cancelAnimationFrame(frame);
  }, [draftId]);

  const effectiveDate = draft?.date || date;
  const effectiveDepartureTime = draft?.departureTime || departureTime || undefined;
  const { seats, loading: seatsLoading, error: seatsError } = useSeatMap(busId, effectiveDate);
  const [preview, setPreview] = useState<GroupBookingPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const totalSeats = seats.length;
  const occupiedCount = useMemo(
    () => seats.filter((s) => s.status === "occupied" || s.status === "blocked").length,
    [seats]
  );
  const groupCount = preview?.assignments.length || draft?.members.length || 0;
  const busAvailableBeforeGroup = Math.max(0, totalSeats - occupiedCount);
  const remainingAvailableSeats = Math.max(0, busAvailableBeforeGroup - groupCount);

  const request = useMemo<GroupBookingRequest | null>(() => {
    if (!draft || isPastLocalDate(draft.date)) return null;
    return {
      tenant_id: DEMO_TENANT_ID,
      bus_id: busId,
      departure_date: toServiceDepartureIso(draft.date, effectiveDepartureTime),
      departure_time: effectiveDepartureTime,
      members: draft.members,
      preferences: draft.preferences,
    };
  }, [busId, draft, effectiveDepartureTime]);

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    previewGroupBooking(request)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not recommend group seats");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request, revision]);

  async function confirm() {
    if (!request || !preview) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createGroupBooking({
        ...request,
        seat_assignments: preview.assignments.map((assignment) => ({
          member_index: assignment.member_index,
          seat_label: assignment.seat_label,
        })),
      });
      saveGroupBoardingPass(result);
      removeGroupBookingDraft(draftId);
      router.push(`/confirmation/group/${result.group_id}`);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Group booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) {
    return (
      <div className={`${uiStyles.pageContainer} max-w-7xl`}>
        <div className="h-4 w-32 rounded bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
        <BookingProgress current="seat" />
        <div className={`${uiStyles.skeleton} h-20 w-full mt-2`} />
        <div className="grid gap-6 lg:grid-cols-3 mt-4">
          <div className={`${uiStyles.skeleton} h-96 lg:col-span-2`} />
          <div className={`${uiStyles.skeleton} h-96`} />
        </div>
      </div>
    );
  }

  if (!draft || draft.members.length === 0) {
    return (
      <div className={`${uiStyles.pageContainer} max-w-2xl`}>
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-lg font-bold">No group booking draft found</h1>
          <p className="mt-1 text-sm">Start a group booking by adding passengers first.</p>
          <Link href={`/book/${busId}/preferences`} className="mt-4 inline-flex items-center gap-2 font-semibold text-ui-primary hover:underline">
            Go to Preferences →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${uiStyles.pageContainer} max-w-7xl`}>
      <Link href={`/book/${busId}/preferences?${new URLSearchParams({ date, origin, dest: destination })}`} className="inline-flex items-center gap-1 text-xs sm:text-sm text-ui-primary hover:underline">
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Change group preferences
      </Link>
      <BookingProgress current="seat" />
      <PageHeader
        eyebrow="Accessible group assignment"
        title="Review Your Group Seats"
        description={`${origin || "Origin"} → ${destination || "Destination"}${date ? ` · ${date}` : ""}`}
      />

      <section aria-live="polite" className="rounded-xl sm:rounded-2xl border sm:border-2 border-amber-500/80 bg-amber-50/90 p-3 sm:p-4 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50 shadow-sm">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100">Accessibility requirements protected</h2>
            <p className="mt-0.5 text-[11px] sm:text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
              {(() => {
                const count = preview?.accessibility_passenger_count ?? draft.members.filter((member) => member.accessibility_needs).length;
                return `${count} ${count === 1 ? "passenger requires" : "passengers require"}`;
              })()} accessible seats. Amber front-priority seats satisfy that requirement; one companion is placed beside the primary accessibility passenger.
            </p>
            <p className="mt-1 text-[10px] sm:text-xs font-semibold text-amber-800 dark:text-amber-300">Accessibility is required · Proximity secondary · Affinity {draft.preferences.affinity_opt_in ? "on" : "off"}</p>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="rounded-lg sm:rounded-xl border border-red-300 bg-red-50 p-2.5 sm:p-3.5 text-xs sm:text-sm text-red-800 shadow-sm">{error} Your group draft is still saved.</div>}

      <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-3">
        <section className={`${uiStyles.surface} p-2.5 sm:p-5 md:p-6 lg:col-span-2`} aria-label="Recommended group seat map">
          {loading || seatsLoading ? (
            <div className="grid min-h-60 sm:min-h-80 place-items-center text-xs sm:text-sm text-slate-500">Finding one safe cluster for the whole group…</div>
          ) : seatsError ? (
            <div className="p-4 sm:p-6 text-xs sm:text-sm text-red-700">{seatsError}</div>
          ) : (
            <>
              {/* Live Dynamic Seat Availability Metrics */}
              <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2 sm:gap-3 rounded-xl border border-ui-border bg-ui-surface p-2.5 sm:p-3.5 shadow-sm text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                  <span className="font-semibold text-ui-foreground">
                    Seat Availability:
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {remainingAvailableSeats} {remainingAvailableSeats === 1 ? "seat" : "seats"} vacant
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] sm:text-xs text-ui-muted-foreground">
                  <span>{busAvailableBeforeGroup} open before group</span>
                  <span>•</span>
                  <span>{groupCount} for your group</span>
                  <span>•</span>
                  <span>{occupiedCount} occupied</span>
                </div>
              </div>

              <BusSeatGrid seats={seats} readOnly groupAssignments={preview?.assignments || []} />
              <div className="mt-3 sm:mt-4"><SeatLegend variant="passenger" /></div>
            </>
          )}
        </section>

        <aside className={`${uiStyles.surface} space-y-3 sm:space-y-4 p-3 sm:p-5`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg font-bold"><Users className="h-4 w-4 sm:h-5 sm:w-5" /> Group of {draft.members.length}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] sm:text-xs font-semibold dark:bg-slate-800">One QR</span>
          </div>
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-ui-muted-foreground pt-1 border-t border-ui-border/50">
            <span>Remaining vacancy:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{remainingAvailableSeats} of {totalSeats} seats</span>
          </div>
          {preview?.assignments.map((assignment) => {
            const member = draft.members[assignment.member_index];
            return (
              <article key={assignment.member_index} className={`rounded-lg sm:rounded-xl border p-2.5 sm:p-3 ${member.accessibility_needs ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "border-ui-border"}`}>
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm truncate"><span className="mr-1.5 sm:mr-2 inline-flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-slate-950 text-[9px] sm:text-[10px] text-white shrink-0">{assignment.member_index + 1}</span>{member.name}</p>
                    {member.accessibility_needs && <p className="mt-0.5 sm:mt-1 inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-amber-800 dark:text-amber-100"><Accessibility className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /> Accessibility passenger</p>}
                  </div>
                  <span className="text-base sm:text-xl font-extrabold text-ui-primary shrink-0">{assignment.seat_label}</span>
                </div>
                <ul className="mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs text-ui-muted-foreground">
                  {assignment.reasons.map((reason) => <li key={reason}>✓ {reason}</li>)}
                </ul>
              </article>
            );
          })}

          {preview && (
            <p className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-blue-50 p-2.5 sm:p-3 text-[11px] sm:text-xs font-semibold text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              <Clock3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> One boarding window: {formatBoardingWindow(preview.boarding_window_start, preview.boarding_window_end)}
            </p>
          )}

          <button type="button" onClick={confirm} disabled={!preview || submitting} className="flex min-h-11 sm:min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 text-xs sm:text-sm font-bold text-white disabled:opacity-40 shadow-sm active:scale-95 transition-transform">
            <Check className="h-4 w-4" /> {submitting ? "Confirming everyone…" : "Confirm Group Booking"}
          </button>
          <button type="button" onClick={() => { setLoading(true); setError(null); setRevision((value) => value + 1); }} disabled={loading} className="flex min-h-10 sm:min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-blue px-4 text-xs sm:text-sm font-semibold text-ui-primary disabled:opacity-40 active:scale-95 transition-transform">
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Regenerate recommendation
          </button>
          <p className="text-[10px] sm:text-xs text-slate-500">Confirmation is atomic: if any seat changes, {BRAND.name} creates no partial group bookings and asks you to regenerate.</p>
        </aside>
      </div>
    </div>
  );
}
