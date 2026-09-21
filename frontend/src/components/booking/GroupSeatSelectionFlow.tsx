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
  RotateCcw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BusSeatGrid } from "@/components/seats/BusSeatGrid";
import { SeatLegend } from "@/components/seats/SeatLegend";
import { BookingProgress } from "@/components/ui/BookingProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import { createGroupBooking, previewGroupBooking } from "@/lib/api";
import { DEMO_TENANT_ID } from "@/lib/demo-config";
import { uiStyles } from "@/lib/design-system";
import { isPastLocalDate, toServiceDepartureIso } from "@/lib/local-date";
import { getGroupBookingDraft, removeGroupBookingDraft, type GroupBookingDraft } from "@/lib/group-booking-drafts";
import { saveGroupBoardingPass } from "@/lib/group-boarding-passes";
import type { GroupBookingPreview, GroupBookingRequest } from "@/lib/types";
import type { SeatMapEntry } from "@/types/seat";
import { formatBoardingWindow } from "@/lib/utils";
import { useSeatMap } from "@/hooks/useSeatMap";

interface GroupMemberAssignment {
  member_index: number;
  member_name: string;
  seat_label: string;
  is_accessibility: boolean;
  reasons: string[];
}

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

  // Manual customization state
  const [customAssignments, setCustomAssignments] = useState<GroupMemberAssignment[] | null>(null);
  const [activeMemberIndex, setActiveMemberIndex] = useState<number>(0);
  const [isCustomized, setIsCustomized] = useState(false);

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
        if (!cancelled) {
          setPreview(result);
          if (!isCustomized) {
            setCustomAssignments(null);
          }
        }
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
  }, [request, revision, isCustomized]);

  const currentAssignments: GroupMemberAssignment[] = useMemo(() => {
    if (customAssignments) return customAssignments;
    if (!preview || !draft) return [];
    return preview.assignments.map((assignment) => ({
      member_index: assignment.member_index,
      member_name: draft.members[assignment.member_index]?.name || `Passenger ${assignment.member_index + 1}`,
      seat_label: assignment.seat_label,
      is_accessibility: assignment.is_accessibility,
      reasons: assignment.reasons,
    }));
  }, [customAssignments, preview, draft]);

  const activeMember = draft?.members[activeMemberIndex];
  const activeNeedsAccessibility = Boolean(activeMember?.accessibility_needs);

  function handleSeatSelect(seat: SeatMapEntry) {
    if (!draft || draft.members.length === 0) return;

    // 1. If clicking a seat already assigned to someone in our group: switch active focus
    const existingGroupAssignment = currentAssignments.find(
      (a) => a.seat_label === seat.seat_label
    );
    if (existingGroupAssignment) {
      setActiveMemberIndex(existingGroupAssignment.member_index);
      setError(null);
      return;
    }

    // 2. If seat is occupied or blocked by another booking: ignore
    if (seat.status === "occupied" || seat.status === "blocked" || seat.status === "reserved") {
      return;
    }

    const currentMember = draft.members[activeMemberIndex];
    if (!currentMember) return;

    // 3. Accessibility check
    if (currentMember.accessibility_needs && !seat.is_accessibility) {
      setError(
        `${currentMember.name} requires an accessible priority seat. Please select one of the amber front seats.`
      );
      return;
    }

    setError(null);

    // 4. Update the active member's assigned seat
    const updated = currentAssignments.map((assignment) => {
      if (assignment.member_index === activeMemberIndex) {
        return {
          ...assignment,
          seat_label: seat.seat_label,
          is_accessibility: seat.is_accessibility,
          reasons: ["Custom preferred seat selected"],
        };
      }
      return assignment;
    });

    setCustomAssignments(updated);
    setIsCustomized(true);

    // 5. Advance to next member if group has multiple passengers
    if (draft.members.length > 1) {
      setActiveMemberIndex((prev) => (prev + 1) % draft.members.length);
    }
  }

  function handleResetToAi() {
    if (!preview || !draft) return;
    setCustomAssignments(null);
    setIsCustomized(false);
    setError(null);
  }

  async function confirm() {
    if (!request || !preview || currentAssignments.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createGroupBooking({
        ...request,
        seat_assignments: currentAssignments.map((assignment) => ({
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
        eyebrow="Customizable group seating"
        title="Review & Pick Group Seats"
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
              })()} accessible seats. Amber front-priority seats satisfy that requirement. You can customize any passenger&apos;s seat by tapping open seats below.
            </p>
            <p className="mt-1 text-[10px] sm:text-xs font-semibold text-amber-800 dark:text-amber-300">Accessibility is required · Proximity secondary · Tap open seats to customize</p>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-lg sm:rounded-xl border border-red-300 bg-red-50 p-2.5 sm:p-3.5 text-xs sm:text-sm text-red-800 shadow-sm">
          {error}
        </div>
      )}

      <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-3">
        <section className={`${uiStyles.surface} relative isolate p-2.5 sm:p-5 md:p-6 lg:col-span-2`} aria-label="Interactive group seat map">
          {loading || seatsLoading ? (
            <div className="grid min-h-60 sm:min-h-80 place-items-center text-xs sm:text-sm text-slate-500">Finding safe cluster for group…</div>
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

              {/* Active Passenger Customization Banner */}
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 sm:p-3.5 dark:border-blue-900/60 dark:bg-blue-950/30">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-ui-primary text-xs sm:text-sm font-black text-white shadow-sm ring-2 ring-ui-primary/30">
                    {activeMemberIndex + 1}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-ui-foreground">
                        Customizing: {activeMember?.name || `Passenger ${activeMemberIndex + 1}`}
                      </span>
                      {activeMember?.accessibility_needs ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-200 ring-1 ring-amber-400">
                          <Accessibility className="h-3 w-3" /> Priority Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">
                          Open to Any Seat
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ui-muted-foreground mt-0.5">
                      {activeMember?.accessibility_needs
                        ? "Tap an open amber accessibility priority seat in the front rows."
                        : "Tap any available seat on the bus to assign, or click another passenger below."}
                    </p>
                  </div>
                </div>

                {isCustomized && (
                  <button
                    type="button"
                    onClick={handleResetToAi}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-ui-surface px-2.5 py-1.5 text-xs font-semibold text-ui-foreground shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    Reset to AI
                  </button>
                )}
              </div>

              <BusSeatGrid
                seats={seats}
                readOnly={false}
                needsAccessibility={activeNeedsAccessibility}
                activeMemberIndex={activeMemberIndex}
                groupAssignments={currentAssignments}
                onSeatSelect={handleSeatSelect}
              />
              <div className="mt-3 sm:mt-4"><SeatLegend variant="passenger" /></div>
            </>
          )}
        </section>

        <aside className={`${uiStyles.surface} space-y-3 sm:space-y-4 p-3 sm:p-5`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg font-bold">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" /> Group of {draft.members.length}
            </h2>
            <span className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold ${
              isCustomized
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
            }`}>
              {isCustomized ? "Customized" : "AI Optimal"}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] sm:text-xs text-ui-muted-foreground pt-1 border-t border-ui-border/50">
            <span>Remaining vacancy:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{remainingAvailableSeats} of {totalSeats} seats</span>
          </div>

          <div className="space-y-2">
            {currentAssignments.map((assignment) => {
              const member = draft.members[assignment.member_index];
              const isActive = assignment.member_index === activeMemberIndex;
              const isCustom = assignment.reasons.some((r) => r.includes("Custom") || r.includes("manually"));

              return (
                <article
                  key={assignment.member_index}
                  onClick={() => {
                    setActiveMemberIndex(assignment.member_index);
                    setError(null);
                  }}
                  className={`cursor-pointer rounded-lg sm:rounded-xl border p-2.5 sm:p-3 transition-all duration-150 ${
                    isActive
                      ? "border-ui-primary ring-2 ring-ui-primary/40 bg-blue-50/60 dark:bg-blue-950/30 shadow-sm"
                      : member?.accessibility_needs
                      ? "border-amber-500/70 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-500"
                      : "border-ui-border hover:border-slate-400 dark:hover:border-slate-600 bg-ui-surface"
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setActiveMemberIndex(assignment.member_index);
                      setError(null);
                    }
                  }}
                  aria-pressed={isActive}
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full text-[9px] sm:text-[10px] font-bold text-white shrink-0 ${
                          isActive ? "bg-ui-primary ring-2 ring-ui-primary/40" : "bg-slate-950"
                        }`}>
                          {assignment.member_index + 1}
                        </span>
                        <span className="font-bold text-xs sm:text-sm truncate text-ui-foreground">{member?.name}</span>
                        {isActive && (
                          <span className="rounded-full bg-ui-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-ui-primary uppercase tracking-wider">
                            Editing
                          </span>
                        )}
                      </div>
                      {member?.accessibility_needs && (
                        <p className="mt-0.5 sm:mt-1 inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-amber-800 dark:text-amber-100">
                          <Accessibility className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /> Accessibility passenger
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-base sm:text-xl font-extrabold text-ui-primary block leading-none">
                        {assignment.seat_label}
                      </span>
                      {isCustom && (
                        <span className="text-[10px] font-medium text-ui-muted-foreground">
                          Custom
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-ui-border/40 text-[10px] sm:text-xs">
                    <span className="text-ui-muted-foreground truncate max-w-[180px]">
                      {assignment.reasons[0] || "Assigned"}
                    </span>
                    <span className="font-semibold text-ui-primary">
                      {isActive ? "Tap open seat ↑" : "Select to change"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {preview && (
            <p className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-blue-50 p-2.5 sm:p-3 text-[11px] sm:text-xs font-semibold text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              <Clock3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> Synchronized window: {formatBoardingWindow(preview.boarding_window_start, preview.boarding_window_end)}
            </p>
          )}

          <button
            type="button"
            onClick={confirm}
            disabled={!preview || submitting || currentAssignments.length === 0}
            className="flex min-h-11 sm:min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 text-xs sm:text-sm font-bold text-white disabled:opacity-40 shadow-sm active:scale-95 transition-transform"
          >
            <Check className="h-4 w-4" />{" "}
            {submitting
              ? "Confirming everyone…"
              : isCustomized
              ? `Confirm Custom Seats (${currentAssignments.length})`
              : "Confirm Group Booking"}
          </button>

          {isCustomized ? (
            <button
              type="button"
              onClick={handleResetToAi}
              className="flex min-h-10 sm:min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 text-xs sm:text-sm font-semibold text-ui-foreground disabled:opacity-40 active:scale-95 transition-transform hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" /> Reset to AI Recommendation
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                setCustomAssignments(null);
                setIsCustomized(false);
                setActiveMemberIndex(0);
                setRevision((value) => value + 1);
              }}
              disabled={loading}
              className="flex min-h-10 sm:min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-blue px-4 text-xs sm:text-sm font-semibold text-ui-primary disabled:opacity-40 active:scale-95 transition-transform"
            >
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Regenerate recommendation
            </button>
          )}
          <p className="text-[10px] sm:text-xs text-slate-500">
            {isCustomized
              ? "Your custom seats will be locked and synchronized with one group QR boarding pass."
              : `AI clustering groups your party safely together. Tap any open seat to override individually.`}
          </p>
        </aside>
      </div>
    </div>
  );
}

