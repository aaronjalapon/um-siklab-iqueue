"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Accessibility,
  Armchair,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Languages,
  Minus,
  Plus,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { BookingProgress } from "@/components/ui/BookingProgress";
import {
  AseanContactInput,
  NameInput,
  parseAseanPhone,
} from "@/components/booking/AseanContactInput";
import { BRAND } from "@/lib/brand";
import { uiStyles } from "@/lib/design-system";
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
  { name: "Ana Santos", phone: "", accessibility_needs: false },
  { name: "Luis Santos", phone: "+639171234568", accessibility_needs: false },
];

export default function PreferencesPage() {
  const { busId } = useParams<{ busId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const date = params.get("date") || params.get("travel_date") || "";
  const origin = params.get("origin") || "";
  const dest = params.get("dest") || params.get("destination") || "";
  const [mode, setMode] = useState<"single" | "group">("single");
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

  function validateGroup(): boolean {
    const next: string[] = [];
    const names = members.map((member) => member.name.trim().toLocaleLowerCase());

    if (members.some((member) => !member.name.trim())) {
      next.push("Every group member needs a name.");
    } else if (members.some((member) => !/^[a-zA-Z\sñÑ]{2,}$/.test(member.name.trim()))) {
      next.push("Member names may only contain letters and spaces (min. 2 characters).");
    }

    if (new Set(names).size !== names.length) {
      next.push("Group member names must be unique.");
    }

    const leadDigits = parseAseanPhone(members[0]?.phone || "").digits;
    if (!leadDigits) {
      next.push("Lead passenger needs a valid mobile number.");
    } else if (leadDigits.length < 7 || leadDigits.length > 10) {
      next.push("Lead passenger mobile number must be up to 10 digits (min. 7 digits).");
    }

    const nonLeadMembers = members.slice(1);
    for (let i = 0; i < nonLeadMembers.length; i++) {
      const memberDigits = parseAseanPhone(nonLeadMembers[i].phone || "").digits;
      if (memberDigits && (memberDigits.length < 7 || memberDigits.length > 10)) {
        next.push(`Group member ${i + 2} mobile number must be up to 10 digits (min. 7 digits).`);
      }
    }

    const allProvidedPhones = members
      .map((member) => member.phone?.trim() || "")
      .filter((p) => Boolean(parseAseanPhone(p).digits));

    if (new Set(allProvidedPhones).size !== allProvidedPhones.length) {
      next.push("Provided mobile numbers must be unique.");
    }

    setErrors(next);
    return next.length === 0;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "group") {
      if (!validateGroup()) return;
      const draftId = saveGroupBookingDraft({
        busId,
        date,
        origin,
        destination: dest,
        members,
        preferences: {
          language_preference: formData.language_pref,
          travel_habit: "group",
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
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      singleErrors.push("Full name is required.");
    } else if (!/^[a-zA-Z\sñÑ]{2,}$/.test(trimmedName)) {
      singleErrors.push("Full name must only contain letters and spaces (min. 2 characters).");
    }

    const singleDigits = parseAseanPhone(formData.phone).digits;
    if (!singleDigits) {
      singleErrors.push("Mobile number is required.");
    } else if (singleDigits.length < 7 || singleDigits.length > 10) {
      singleErrors.push("Mobile number must be up to 10 digits (min. 7 digits).");
    }

    setErrors(singleErrors);
    if (singleErrors.length) return;
    router.push(
      `/book/${busId}/seat-selection?${new URLSearchParams({
        date,
        origin,
        dest,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
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
    mode === "group"
      ? members.filter((member) => member.accessibility_needs).length
      : Number(formData.accessibility_needs);

  return (
    <div className={`${uiStyles.pageContainer} max-w-4xl !space-y-3 sm:!space-y-5 !px-3 sm:!px-6 !py-3 sm:!py-6`}>
      <div className="flex items-center justify-between">
        <Link
          href={`/buy?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&date=${date}`}
          prefetch={false}
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-ui-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden /> Back to search
        </Link>
      </div>

      <BookingProgress current="preferences" />

      <header className="min-w-0">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-ui-primary">
          Passenger profile
        </p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-ui-foreground tracking-tight">
          Who are you booking for?
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-ui-muted-foreground">
          {BRAND.name} applies assistance needs first, then keeps groups seated together.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-3 sm:space-y-5">
        {/* Booking mode selector: strictly horizontal side-by-side with no text stacking */}
        <fieldset className={`${uiStyles.surface} p-2.5 sm:p-4`}>
          <legend className="sr-only">Booking mode</legend>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {(["single", "group"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => {
                  setMode(value);
                  setErrors([]);
                }}
                className={`min-h-[42px] sm:min-h-12 w-full rounded-xl border px-2 sm:px-4 py-2 sm:py-2.5 font-bold transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 active:scale-[0.99] ${
                  mode === value
                    ? "border-brand-blue bg-blue-50 text-ui-primary dark:bg-blue-950/40 shadow-sm"
                    : "border-ui-border bg-ui-surface text-slate-600 hover:border-brand-blue/40 hover:text-ui-primary dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
                }`}
              >
                {value === "group" ? (
                  <Users className="h-4 w-4 shrink-0 text-brand-orange" aria-hidden />
                ) : (
                  <UserRound className="h-4 w-4 shrink-0 text-ui-primary" aria-hidden />
                )}
                <span className="whitespace-nowrap">
                  {value === "group" ? "Group Booking" : "Single Booking"}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Passenger details section */}
        <section className={`${uiStyles.surface} p-3.5 sm:p-5 md:p-6`}>
          <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-bold text-ui-foreground">
              {mode === "group" ? `Group members (${members.length} of 6)` : "Passenger details"}
            </h2>
            {mode === "group" && (
              <button
                type="button"
                onClick={() => {
                  setMembers(DEMO_MEMBERS.map((member) => ({ ...member })));
                  setFormData((current) => ({
                    ...current,
                    language_pref: "fil",
                    travel_habits: "group",
                    affinity_opt_in: false,
                  }));
                }}
                className="rounded-lg border border-brand-blue/50 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-ui-primary hover:bg-blue-50 dark:hover:bg-blue-950/30 transition active:scale-95"
              >
                Load demo group
              </button>
            )}
          </div>

          {mode === "single" ? (
            <div className="grid gap-2.5 sm:gap-4 md:grid-cols-2">
              <NameInput
                id="name"
                label="Full name"
                value={formData.name}
                required={true}
                onChange={(value) => updateField("name", value)}
              />
              <AseanContactInput
                id="phone"
                label="Mobile number"
                value={formData.phone}
                required={true}
                placeholder=""
                onChange={(value) => updateField("phone", value)}
              />
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {members.map((member, index) => (
                <fieldset key={index} className="clay-inset space-y-2.5 rounded-xl border border-ui-border bg-ui-surface-soft p-3 sm:p-4">
                  <legend className="px-1 text-xs font-bold text-ui-foreground sm:text-sm">
                    {index === 0 ? "Lead passenger (Primary contact)" : `Group member ${index + 1}`}
                  </legend>
                  <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
                    <NameInput
                      id={`member-${index}-name`}
                      label="Full name"
                      value={member.name}
                      required={true}
                      onChange={(name) => updateMember(index, { name })}
                    />
                    <AseanContactInput
                      id={`member-${index}-phone`}
                      label="Mobile number"
                      value={member.phone || ""}
                      required={index === 0}
                      placeholder={index === 0 ? "" : "Optional"}
                      onChange={(phone) => updateMember(index, { phone })}
                    />
                  </div>
                  <div className="flex items-center pt-0.5">
                    <label
                      htmlFor={`member-${index}-accessibility`}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer select-none ${
                        member.accessibility_needs
                          ? "bg-amber-100/90 dark:bg-amber-900/50 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-100"
                          : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60"
                      }`}
                      title="Accessible / PWD seating required"
                    >
                      <input
                        id={`member-${index}-accessibility`}
                        type="checkbox"
                        checked={member.accessibility_needs}
                        onChange={(event) => updateMember(index, { accessibility_needs: event.target.checked })}
                        aria-label={`${member.name || `Group member ${index + 1}`} needs an accessible seat`}
                        className="h-3.5 w-3.5 rounded border-amber-500 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <Accessibility className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
                    </label>
                  </div>
                </fieldset>
              ))}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={members.length <= 2}
                  onClick={() => setMembers((current) => current.slice(0, -1))}
                  className="inline-flex min-h-[36px] sm:min-h-10 items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white px-3.5 sm:px-4 text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 active:scale-95"
                >
                  <Minus className="h-3.5 w-3.5" /> Remove
                </button>
                <button
                  type="button"
                  disabled={members.length >= 6}
                  onClick={() => setMembers((current) => [...current, { ...EMPTY_MEMBER }])}
                  className="inline-flex min-h-[36px] sm:min-h-10 items-center justify-center gap-1.5 rounded-xl border border-blue-500/40 bg-brand-blue hover:bg-blue-600 active:bg-blue-700 text-white px-3.5 sm:px-4 text-xs sm:text-sm font-bold shadow-md shadow-brand-blue/20 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" /> Add member
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Accessibility assistance priority box */}
        <section aria-labelledby="assistance-title" className="clay-surface-low rounded-2xl border border-ui-warning/45 bg-ui-warning-surface p-3.5 text-ui-warning sm:p-5">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <div className="min-w-0">
              <h2 id="assistance-title" className="text-xs font-extrabold sm:text-sm">Accessibility assistance</h2>
              <p className="mt-0.5 text-[11px] leading-relaxed sm:text-xs">
                {accessibilityCount} passenger{accessibilityCount === 1 ? " currently requires" : "s currently require"} priority seating. This is a hard requirement; group proximity is secondary.
              </p>
              {mode === "single" && (
                <label className="mt-2.5 flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-ui-warning/40 bg-ui-surface px-2 py-1.5 text-[10px] font-semibold text-ui-foreground sm:gap-2 sm:px-3 sm:text-xs">
                  <input
                    type="checkbox"
                    checked={formData.accessibility_needs}
                    onChange={(event) => updateField("accessibility_needs", event.target.checked)}
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded border-amber-500 shrink-0"
                  />
                  <Accessibility className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 shrink-0" />
                  <span className="whitespace-nowrap">I require an accessible seat near the exit</span>
                </label>
              )}
            </div>
          </div>
        </section>

        {/* Shared preferences section */}
        <section className={`${uiStyles.surface} grid gap-2.5 sm:gap-4 p-3.5 sm:p-5 md:grid-cols-2 md:p-6`}>
          <label className="text-xs sm:text-sm font-medium">
            <span className="mb-1 flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Languages className="h-3.5 w-3.5" /> Shared language
            </span>
            <div className="relative">
              <select
                value={formData.language_pref}
                onChange={(event) => updateField("language_pref", event.target.value)}
                className="clay-control block min-h-11 w-full cursor-pointer appearance-none rounded-xl border border-ui-border bg-ui-surface py-2 pl-3 pr-9 text-xs text-ui-foreground focus:outline-none focus:ring-2 focus:ring-ui-primary/20 sm:pr-10 sm:text-sm"
              >
                {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden />
            </div>
          </label>
          <label className="text-xs sm:text-sm font-medium">
            <span className="mb-1 flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Armchair className="h-3.5 w-3.5" /> Shared seat preference
            </span>
            <div className="relative">
              <select
                value={formData.preferred_seat_type}
                onChange={(event) => updateField("preferred_seat_type", event.target.value)}
                className="clay-control block min-h-11 w-full cursor-pointer appearance-none rounded-xl border border-ui-border bg-ui-surface py-2 pl-3 pr-9 text-xs text-ui-foreground focus:outline-none focus:ring-2 focus:ring-ui-primary/20 sm:pr-10 sm:text-sm"
              >
                <option value="">No preference</option>
                <option value="window">Window</option>
                <option value="aisle">Aisle</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden />
            </div>
          </label>
          <label className="clay-inset flex cursor-pointer items-start gap-2.5 rounded-xl border border-ui-border bg-ui-surface-soft p-2.5 text-xs transition-colors hover:border-ui-primary/45 sm:p-3 sm:text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={formData.affinity_opt_in}
              onChange={(event) => updateField("affinity_opt_in", event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-brand-blue cursor-pointer"
            />
            <div>
              <strong className="font-semibold text-ui-foreground">
                Seatmate affinity matching <span className="text-[10px] sm:text-xs font-normal text-slate-400 dark:text-slate-500">(Optional)</span>
              </strong>
              <span className="block text-[11px] sm:text-xs text-ui-muted-foreground mt-0.5 leading-relaxed">
                Helps place you beside passengers who share your preferred language and compatible travel preferences for a more comfortable journey.
              </span>
            </div>
          </label>
        </section>

        {errors.length > 0 && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs sm:text-sm text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200">
            <ul className="list-disc space-y-1 pl-5">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit action button: Emerald CTA */}
        <button
          type="submit"
          className={`${uiStyles.successButton} flex min-h-[42px] sm:min-h-12 w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold group active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2`}
        >
          <span>{mode === "group" ? "Recommend Group Seats" : "Find My Best Seat"}</span>
          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
        </button>
      </form>
    </div>
  );
}
