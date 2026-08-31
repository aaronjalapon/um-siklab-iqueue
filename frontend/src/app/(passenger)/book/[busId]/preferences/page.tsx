"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Accessibility,
  Armchair,
  ArrowLeft,
  ChevronRight,
  Languages,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { BookingProgress } from "@/components/ui/BookingProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import { BRAND } from "@/lib/brand";
import { glassStyles } from "@/lib/design-system";
import { saveGroupBookingDraft } from "@/lib/group-booking-drafts";
import type { GroupMemberRequest, PassengerFormData } from "@/lib/types";
import { LANGUAGE_LABELS } from "@/lib/utils";

const EMPTY_MEMBER: GroupMemberRequest = {
  name: "",
  phone: "",
  accessibility_needs: false,
};

const DEMO_MEMBERS: GroupMemberRequest[] = [
  { name: "Maria Santos", phone: "+639171234567", accessibility_needs: true },
  { name: "Ana Santos", phone: "+639171234568", accessibility_needs: false },
  { name: "Luis Santos", phone: "+639171234569", accessibility_needs: false },
];

export default function PreferencesPage() {
  const { busId } = useParams<{ busId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const date = params.get("date") || "";
  const origin = params.get("origin") || "";
  const dest = params.get("dest") || "";
  const [mode, setMode] = useState<"single" | "family">("single");
  const [formData, setFormData] = useState<PassengerFormData>({
    name: "",
    phone: "",
    language_pref: "fil",
    travel_habits: "leisure",
    lifestyle_interests: "",
    affinity_opt_in: false,
    accessibility_needs: false,
    preferred_seat_type: "",
    preferred_side: "",
  });
  const [members, setMembers] = useState<GroupMemberRequest[]>([
    { ...EMPTY_MEMBER },
    { ...EMPTY_MEMBER },
    { ...EMPTY_MEMBER },
  ]);
  const [errors, setErrors] = useState<string[]>([]);

  function updateField<K extends keyof PassengerFormData>(
    key: K,
    value: PassengerFormData[K]
  ) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function updateMember(index: number, patch: Partial<GroupMemberRequest>) {
    setMembers((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, ...patch } : member
      )
    );
  }

  function validateFamily(): boolean {
    const next: string[] = [];
    const names = members.map((member) => member.name.trim().toLocaleLowerCase());
    const phones = members.map((member) => member.phone.trim());
    if (members.some((member) => !member.name.trim())) {
      next.push("Every family member needs a name.");
    }
    if (members.some((member) => member.phone.trim().length < 5)) {
      next.push("Every family member needs a valid phone number.");
    }
    if (new Set(names).size !== names.length) next.push("Family member names must be unique.");
    if (new Set(phones).size !== phones.length) next.push("Phone numbers must be unique.");
    setErrors(next);
    return next.length === 0;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "family") {
      if (!validateFamily()) return;
      const draftId = saveGroupBookingDraft({
        busId,
        date,
        origin,
        destination: dest,
        members,
        preferences: {
          language_preference: formData.language_pref,
          travel_habit: "family",
          lifestyle_interest: formData.lifestyle_interests || undefined,
          seat_preference: formData.preferred_seat_type || undefined,
          preferred_side: formData.preferred_side || undefined,
          affinity_opt_in: formData.affinity_opt_in,
        },
      });
      router.push(
        `/book/${busId}/seat-selection?${new URLSearchParams({ date, origin, dest, draft: draftId })}`
      );
      return;
    }

    const singleErrors: string[] = [];
    if (!formData.name.trim()) singleErrors.push("Name is required.");
    if (formData.phone.trim().length < 5) singleErrors.push("Enter a valid phone number.");
    setErrors(singleErrors);
    if (singleErrors.length) return;
    router.push(
      `/book/${busId}/seat-selection?${new URLSearchParams({
        date,
        origin,
        dest,
        name: formData.name,
        phone: formData.phone,
        language_pref: formData.language_pref,
        travel_habits: formData.travel_habits,
        lifestyle_interests: formData.lifestyle_interests,
        affinity_opt_in: String(formData.affinity_opt_in),
        accessibility_needs: String(formData.accessibility_needs),
        preferred_seat_type: formData.preferred_seat_type,
        preferred_side: formData.preferred_side,
      })}`
    );
  }

  const accessibilityCount =
    mode === "family"
      ? members.filter((member) => member.accessibility_needs).length
      : Number(formData.accessibility_needs);

  return (
    <div className={`${glassStyles.pageContainer} max-w-4xl`}>
      <Link
        href={`/buy?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&date=${date}`}
        prefetch={false}
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to search
      </Link>
      <BookingProgress current="preferences" />
      <PageHeader
        eyebrow="Passenger profile"
        title="Who are you booking for?"
        description={`${BRAND.name} applies assistance needs first, then keeps families close.`}
      />

      <form onSubmit={submit} className="space-y-5">
        <fieldset className={`${glassStyles.panel} p-5`}>
          <legend className="sr-only">Booking mode</legend>
          <div className="grid grid-cols-2 gap-3">
            {(["single", "family"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => {
                  setMode(value);
                  setErrors([]);
                }}
                className={`min-h-14 rounded-xl border px-4 py-3 font-semibold capitalize ${
                  mode === value
                    ? "border-brand-blue bg-blue-50 text-brand-blue dark:bg-blue-950/40"
                    : "border-slate-300 bg-white/60 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {value === "family" ? <Users className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                  {value === "family" ? "Family booking" : "Single booking"}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <section className={`${glassStyles.panel} p-5 md:p-6`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              {mode === "family" ? `Family members (${members.length} of 6)` : "Passenger details"}
            </h2>
            {mode === "family" && (
              <button
                type="button"
                onClick={() => {
                  setMembers(DEMO_MEMBERS.map((member) => ({ ...member })));
                  setFormData((current) => ({
                    ...current,
                    language_pref: "fil",
                    travel_habits: "family",
                    affinity_opt_in: false,
                  }));
                }}
                className="rounded-lg border border-brand-blue px-3 py-2 text-xs font-semibold text-brand-blue hover:bg-blue-50"
              >
                Load BIDA demo family
              </button>
            )}
          </div>

          {mode === "single" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField id="name" label="Full name" value={formData.name} onChange={(value) => updateField("name", value)} />
              <TextField id="phone" label="Phone number" type="tel" value={formData.phone} onChange={(value) => updateField("phone", value)} />
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member, index) => (
                <fieldset key={index} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <legend className="px-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                    {index === 0 ? "Lead passenger" : `Family member ${index + 1}`}
                  </legend>
                  <div className="grid gap-3 md:grid-cols-2">
                    <TextField id={`member-${index}-name`} label="Full name" value={member.name} onChange={(name) => updateMember(index, { name })} />
                    <TextField id={`member-${index}-phone`} label="Phone number" type="tel" value={member.phone} onChange={(phone) => updateMember(index, { phone })} />
                  </div>
                  <label className="mt-3 flex min-h-12 items-center gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                    <input
                      type="checkbox"
                      checked={member.accessibility_needs}
                      onChange={(event) => updateMember(index, { accessibility_needs: event.target.checked })}
                      aria-label={`${member.name || `Family member ${index + 1}`} needs an accessible seat`}
                      className="h-5 w-5 rounded border-amber-500"
                    />
                    <Accessibility className="h-5 w-5" aria-hidden /> Accessible seat required
                  </label>
                </fieldset>
              ))}
              <div className="flex gap-2">
                <button type="button" disabled={members.length <= 2} onClick={() => setMembers((current) => current.slice(0, -1))} className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm disabled:opacity-40">
                  <Minus className="h-4 w-4" /> Remove
                </button>
                <button type="button" disabled={members.length >= 6} onClick={() => setMembers((current) => [...current, { ...EMPTY_MEMBER }])} className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm disabled:opacity-40">
                  <Plus className="h-4 w-4" /> Add member
                </button>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="assistance-title" className="rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 text-amber-950 shadow-sm dark:bg-amber-950/40 dark:text-amber-50">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-7 w-7 shrink-0" aria-hidden />
            <div>
              <h2 id="assistance-title" className="text-lg font-extrabold">Accessibility assistance</h2>
              <p className="mt-1 text-sm">
                {accessibilityCount} passenger{accessibilityCount === 1 ? " currently requires" : "s currently require"} priority seating. This is a hard requirement; family proximity is secondary.
              </p>
              {mode === "single" && (
                <label className="mt-4 flex min-h-12 items-center gap-3 rounded-lg border border-amber-600 bg-white/70 px-3 py-2 font-semibold">
                  <input type="checkbox" checked={formData.accessibility_needs} onChange={(event) => updateField("accessibility_needs", event.target.checked)} className="h-5 w-5" />
                  <Accessibility className="h-5 w-5" /> I require an accessible seat near the exit
                </label>
              )}
            </div>
          </div>
        </section>

        <section className={`${glassStyles.panel} grid gap-4 p-5 md:grid-cols-2 md:p-6`}>
          <label className="text-sm font-medium">
            <span className="mb-1 flex items-center gap-2"><Languages className="h-4 w-4" /> Shared language</span>
            <select value={formData.language_pref} onChange={(event) => updateField("language_pref", event.target.value)} className={`${glassStyles.input} w-full`}>
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            <span className="mb-1 flex items-center gap-2"><Armchair className="h-4 w-4" /> Shared seat preference</span>
            <select value={formData.preferred_seat_type} onChange={(event) => updateField("preferred_seat_type", event.target.value)} className={`${glassStyles.input} w-full`}>
              <option value="">No preference</option><option value="window">Window</option><option value="aisle">Aisle</option>
            </select>
          </label>
          <label className="md:col-span-2 flex items-start gap-3 rounded-lg border p-3 text-sm">
            <input type="checkbox" checked={formData.affinity_opt_in} onChange={(event) => updateField("affinity_opt_in", event.target.checked)} className="mt-1" />
            <span><strong>Optional affinity matching</strong><span className="block text-xs text-slate-500">Left off in the BIDA family demo. It never overrides accessibility or family proximity.</span></span>
          </label>
        </section>

        {errors.length > 0 && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            <ul className="list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        )}

        <button type="submit" className={`${glassStyles.primaryButton} flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold`}>
          {mode === "family" ? "Recommend Family Seats" : "Find My Best Seat"}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  type = "text",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  type?: "text" | "tel";
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
      <span className="mb-1 flex items-center gap-2">
        {type === "tel" ? <Phone className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}{label}
      </span>
      <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required className={`${glassStyles.input} w-full`} />
    </label>
  );
}
