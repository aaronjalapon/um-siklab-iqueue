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
import { glassStyles } from "@/lib/design-system";
import { getGroupBookingDraft, removeGroupBookingDraft } from "@/lib/group-booking-drafts";
import { saveGroupBoardingPass } from "@/lib/group-boarding-passes";
import type { GroupBookingPreview, GroupBookingRequest } from "@/lib/types";
import { useSeatMap } from "@/hooks/useSeatMap";

export function GroupSeatSelectionFlow({
  busId,
  draftId,
  date,
  origin,
  destination,
}: {
  busId: string;
  draftId: string;
  date: string;
  origin: string;
  destination: string;
}) {
  const router = useRouter();
  const draft = useMemo(() => getGroupBookingDraft(draftId), [draftId]);
  const { seats, loading: seatsLoading, error: seatsError } = useSeatMap(busId, date);
  const [preview, setPreview] = useState<GroupBookingPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const request = useMemo<GroupBookingRequest | null>(() => {
    if (!draft) return null;
    return {
      tenant_id: DEMO_TENANT_ID,
      bus_id: busId,
      departure_date: new Date(draft.date).toISOString(),
      members: draft.members,
      preferences: draft.preferences,
    };
  }, [busId, draft]);

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    previewGroupBooking(request)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not recommend family seats");
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
      setError(cause instanceof Error ? cause.message : "Family booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!draft) {
    return (
      <div className={`${glassStyles.pageContainer} max-w-2xl`}>
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
          <h1 className="text-xl font-bold">Family draft not found</h1>
          <p className="mt-2 text-sm">For privacy, family details stay in this tab’s session storage. Return to preferences and enter them again.</p>
          <Link href={`/book/${busId}/preferences?${new URLSearchParams({ date, origin, dest: destination })}`} className="mt-4 inline-flex font-semibold text-brand-blue hover:underline">Return to preferences</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${glassStyles.pageContainer} max-w-7xl`}>
      <Link href={`/book/${busId}/preferences?${new URLSearchParams({ date, origin, dest: destination })}`} className="inline-flex items-center gap-1 text-sm text-brand-blue hover:underline">
        <ArrowLeft className="h-4 w-4" /> Change family preferences
      </Link>
      <BookingProgress current="seat" />
      <PageHeader
        eyebrow="Accessible family assignment"
        title="Review Your Family Seats"
        description={`${origin || "Origin"} → ${destination || "Destination"}${date ? ` · ${date}` : ""}`}
      />

      <section aria-live="polite" className="mb-5 rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-7 w-7 shrink-0" aria-hidden />
          <div>
            <h2 className="font-extrabold">Accessibility requirements protected</h2>
            <p className="mt-1 text-sm">
              {(() => {
                const count = preview?.accessibility_passenger_count ?? draft.members.filter((member) => member.accessibility_needs).length;
                return `${count} ${count === 1 ? "passenger requires" : "passengers require"}`;
              })()} accessible seats. Amber front-priority seats satisfy that requirement; one numbered companion is placed beside the primary accessibility passenger.
            </p>
            <p className="mt-2 text-xs font-semibold">Accessibility is required. Family proximity is secondary. Affinity matching is {draft.preferences.affinity_opt_in ? "on" : "off"}.</p>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">{error} Your family draft is still saved.</div>}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <section className={`${glassStyles.panel} p-4 md:p-6 lg:col-span-2`} aria-label="Recommended family seat map">
          {loading || seatsLoading ? (
            <div className="grid min-h-80 place-items-center text-sm text-slate-500">Finding one safe cluster for the whole family…</div>
          ) : seatsError ? (
            <div className="p-6 text-red-700">{seatsError}</div>
          ) : (
            <>
              <BusSeatGrid seats={seats} readOnly groupAssignments={preview?.assignments || []} />
              <div className="mt-4"><SeatLegend variant="passenger" /></div>
            </>
          )}
        </section>

        <aside className={`${glassStyles.panel} space-y-4 p-5 lg:sticky lg:top-24`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5" /> Family of {draft.members.length}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold dark:bg-slate-800">One QR</span>
          </div>
          {preview?.assignments.map((assignment) => {
            const member = draft.members[assignment.member_index];
            return (
              <article key={assignment.member_index} className={`rounded-xl border p-3 ${member.accessibility_needs ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "border-slate-200 dark:border-slate-700"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold"><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[10px] text-white">{assignment.member_index + 1}</span>{member.name}</p>
                    {member.accessibility_needs && <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-100"><Accessibility className="h-3.5 w-3.5" /> Accessibility passenger</p>}
                  </div>
                  <span className="text-xl font-extrabold text-brand-blue">{assignment.seat_label}</span>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {assignment.reasons.map((reason) => <li key={reason}>✓ {reason}</li>)}
                </ul>
              </article>
            );
          })}

          {preview && (
            <p className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-xs font-semibold text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              <Clock3 className="h-4 w-4" /> One boarding window: {new Date(preview.boarding_window_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–{new Date(preview.boarding_window_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}

          <button type="button" onClick={confirm} disabled={!preview || submitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 font-bold text-white disabled:opacity-40">
            <Check className="h-4 w-4" /> {submitting ? "Confirming everyone…" : "Confirm Family Booking"}
          </button>
          <button type="button" onClick={() => { setLoading(true); setError(null); setRevision((value) => value + 1); }} disabled={loading} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-blue px-4 text-sm font-semibold text-brand-blue disabled:opacity-40">
            <RefreshCw className="h-4 w-4" /> Regenerate recommendation
          </button>
          <p className="text-xs text-slate-500">Confirmation is atomic: if any seat changes, {BRAND.name} creates no partial family bookings and asks you to regenerate.</p>
        </aside>
      </div>
    </div>
  );
}
