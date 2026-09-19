"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Accessibility,
  AlertTriangle,
  Armchair,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Languages,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { BookingProgress } from "@/components/ui/BookingProgress";
import {
  AseanContactInput,
  NameInput,
  parseAseanPhone,
} from "@/components/booking/AseanContactInput";
import {
  AffinityMatchingSettings,
  type AffinityProfile,
  DEFAULT_AFFINITY_PROFILE,
} from "@/components/booking/AffinityMatchingSettings";
import { BRAND } from "@/lib/brand";
import { uiStyles } from "@/lib/design-system";
import { saveGroupBookingDraft } from "@/lib/group-booking-drafts";
import { isPastLocalDate } from "@/lib/local-date";
import type { GroupMemberRequest, PassengerFormData } from "@/lib/types";
import { LANGUAGE_LABELS } from "@/lib/utils";
import { useSeatMap } from "@/hooks/useSeatMap";

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
  const departureTime = params.get("departure_time") || params.get("time") || "";
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
  const { seats } = useSeatMap(busId, date);
  const availableSeatsCount =
    seats.length > 0
      ? seats.filter((s) => s.status === "available").length
      : null;
  const [showAffinityWarningModal, setShowAffinityWarningModal] = useState(false);

  function updateField<K extends keyof PassengerFormData>(
    key: K,
    value: PassengerFormData[K]
  ) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  const [affinityProfile, setAffinityProfile] = useState<AffinityProfile>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("iqueue:affinity_profile:v1");
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return DEFAULT_AFFINITY_PROFILE;
  });

  function handleAffinityToggle(checked: boolean) {
    updateField("affinity_opt_in", checked);
    if (checked) {
      if (!formData.lifestyle_interests) {
        updateField(
          "lifestyle_interests",
          affinityProfile.interests
            .map((i) => i.toLowerCase().replace(/\s+/g, "_"))
            .join(",")
        );
      }
      if (affinityProfile.socialOpenness === "quiet") {
        updateField("travel_habits", "quiet");
      } else if (affinityProfile.socialOpenness === "yes") {
        updateField("travel_habits", "social");
      } else {
        updateField("travel_habits", "leisure");
      }
    }
  }

  function handleAffinityProfileChange(updated: AffinityProfile) {
    setAffinityProfile(updated);
    updateField(
      "lifestyle_interests",
      updated.interests
        .map((i) => i.toLowerCase().replace(/\s+/g, "_"))
        .join(",")
    );
    if (updated.socialOpenness === "quiet") {
      updateField("travel_habits", "quiet");
    } else if (updated.socialOpenness === "yes") {
      updateField("travel_habits", "social");
    } else {
      updateField("travel_habits", "leisure");
    }
    if (
      updated.spokenLanguages.length > 0 &&
      updated.spokenLanguages[0] !== formData.language_pref
    ) {
      updateField("language_pref", updated.spokenLanguages[0]);
    }
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          "iqueue:affinity_profile:v1",
          JSON.stringify(updated)
        );
      } catch {
        // ignore
      }
    }
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

    // Capacity check for group booking
    if (availableSeatsCount !== null && availableSeatsCount < members.length) {
      if (availableSeatsCount === 0) {
        next.push("This bus is currently full. No seats are available for booking. Please select another bus.");
      } else if (availableSeatsCount === 1) {
        next.push("This bus only has 1 seat remaining. Group booking requires at least 2 seats. Please switch to single booking or choose another bus.");
      } else {
        next.push(`This bus only has ${availableSeatsCount} seats available, which cannot accommodate your group of ${members.length} passengers. Please reduce your group size or choose another bus.`);
      }
    }

    setErrors(next);
    return next.length === 0;
  }

  function proceedToSeatSelection() {
    const singleParams: Record<string, string> = {
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
    };
    if (departureTime) singleParams.departure_time = departureTime;

    router.push(
      `/book/${busId}/seat-selection?${new URLSearchParams(singleParams)}`
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPastLocalDate(date)) {
      setErrors(["Cannot book past dates. Please return to Find Your Bus to choose a valid date."]);
      return;
    }

    if (mode === "group") {
      if (!validateGroup()) return;
      const draftId = saveGroupBookingDraft({
        busId,
        date,
        origin,
        destination: dest,
        departureTime: departureTime || undefined,
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
      const queryParams: Record<string, string> = { date, origin, dest, draft: draftId };
      if (departureTime) queryParams.departure_time = departureTime;
      router.push(
        `/book/${busId}/seat-selection?${new URLSearchParams(queryParams)}`
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

    // Check if bus only has 1 seat remaining (Tagbilaran to Jagna or 1 available seat)
    const isSingleRemainingSeat =
      availableSeatsCount === 1 ||
      (origin.toLowerCase().includes("tagbilaran") && dest.toLowerCase().includes("jagna"));

    // If affinity matching is opted-in on a 1-seat bus, prompt user decision modal
    if (formData.affinity_opt_in && isSingleRemainingSeat) {
      setShowAffinityWarningModal(true);
      return;
    }

    proceedToSeatSelection();
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
        {isPastLocalDate(date) && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs sm:text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
            <div>
              <p className="font-bold">Cannot book past dates</p>
              <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">
                The travel date ({date}) has already passed. Please return to search to choose today or a future date.
              </p>
            </div>
          </div>
        )}

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
        <section className={`${uiStyles.surface} p-3.5 sm:p-5 md:p-6 min-w-0 max-w-full overflow-hidden`}>
          <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-ui-foreground truncate">
              {mode === "group" ? `Group members (${members.length})` : "Passenger details"}
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
                className="rounded-lg border border-brand-blue/50 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-ui-primary hover:bg-blue-50 dark:hover:bg-blue-950/30 transition active:scale-95 cursor-pointer shrink-0"
              >
                Load demo group
              </button>
            )}
          </div>

          {mode === "group" && availableSeatsCount !== null && availableSeatsCount < members.length && (
            <div className="mb-4 rounded-xl border border-amber-300/80 bg-amber-50/90 p-3 sm:p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold">Insufficient seats for group booking</p>
                  <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
                    {availableSeatsCount === 0
                      ? "This bus is currently full. No seats are available for booking."
                      : availableSeatsCount === 1
                      ? "This bus only has 1 seat remaining. Group booking requires at least 2 seats."
                      : `This bus only has ${availableSeatsCount} seats remaining, which cannot accommodate ${members.length} passengers.`}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {availableSeatsCount === 1 && (
                      <button
                        type="button"
                        onClick={() => setMode("single")}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-700 transition active:scale-95 cursor-pointer shadow-2xs"
                      >
                        Switch to Single Booking (1 seat available)
                      </button>
                    )}
                    <Link
                      href={`/buy?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&date=${date}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-white transition"
                    >
                      Find Another Bus
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === "single" ? (
            <div className="grid gap-2.5 sm:gap-4 md:grid-cols-2 min-w-0">
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
            <div className="space-y-3 sm:space-y-4 min-w-0 max-w-full">
              {members.map((member, index) => (
                <div
                  key={index}
                  role="group"
                  aria-labelledby={`member-${index}-heading`}
                  className="clay-inset space-y-2.5 rounded-xl border border-ui-border bg-ui-surface-soft p-3 sm:p-4 min-w-0 max-w-full overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-ui-border/40 pb-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ui-primary/10 text-[10px] font-bold text-ui-primary">
                        {index + 1}
                      </span>
                      <h3
                        id={`member-${index}-heading`}
                        className="text-xs sm:text-sm font-bold text-ui-foreground truncate"
                      >
                        {index === 0 ? "Lead passenger (Primary contact)" : `Group member ${index + 1}`}
                      </h3>
                    </div>
                    {index === 0 ? (
                      <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300 shrink-0">
                        Lead
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-ui-muted-foreground shrink-0">
                        #{index + 1}
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2 min-w-0">
                    <NameInput
                      id={`member-${index}-name`}
                      label="Full name"
                      value={member.name}
                      required={true}
                      onChange={(name) => updateMember(index, { name })}
                    />
                    <AseanContactInput
                      id={`member-${index}-phone`}
                      label={index === 0 ? "Mobile number" : "Mobile number (Optional)"}
                      value={member.phone || ""}
                      required={index === 0}
                      placeholder={index === 0 ? "" : "Optional"}
                      onChange={(phone) => updateMember(index, { phone })}
                    />
                  </div>
                  <div className="flex items-center pt-0.5 min-w-0">
                    <label
                      htmlFor={`member-${index}-accessibility`}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer select-none min-w-0 ${
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
                        className="h-3.5 w-3.5 rounded border-amber-500 text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                      />
                      <Accessibility className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
                      <span className="text-[11px] font-medium truncate">
                        Accessible seating
                      </span>
                    </label>
                  </div>
                </div>
              ))}
              <div className="flex gap-2.5 pt-1 min-w-0">
                <button
                  type="button"
                  disabled={members.length <= 2}
                  onClick={() => setMembers((current) => current.slice(0, -1))}
                  className="inline-flex min-h-[36px] sm:min-h-10 items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white px-3.5 sm:px-4 text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" /> Remove
                </button>
                <button
                  type="button"
                  onClick={() => setMembers((current) => [...current, { ...EMPTY_MEMBER }])}
                  className="inline-flex min-h-[36px] sm:min-h-10 items-center justify-center gap-1.5 rounded-xl border border-blue-500/40 bg-brand-blue hover:bg-blue-600 active:bg-blue-700 text-white px-3.5 sm:px-4 text-xs sm:text-sm font-bold shadow-md shadow-brand-blue/20 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 active:scale-95 cursor-pointer"
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
                {mode === "single"
                  ? formData.accessibility_needs
                    ? "Priority seating near the exit will be prioritized for mobility or accessibility assistance."
                    : "Front priority seats are held for passengers requiring mobility or accessibility assistance."
                  : accessibilityCount > 0
                  ? `${accessibilityCount} group member${accessibilityCount === 1 ? " requires" : "s require"} priority seating near the exit. Group proximity will adjust around accessible seats.`
                  : "No group members currently require accessibility priority seating. Standard seating rules apply."}
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
          <div className="md:col-span-2 space-y-2 min-w-0 max-w-full overflow-hidden">
            <label className="clay-inset flex cursor-pointer items-start gap-2.5 rounded-xl border border-ui-border bg-ui-surface-soft p-2.5 text-xs transition-colors hover:border-ui-primary/45 sm:p-3 sm:text-sm">
              <input
                type="checkbox"
                checked={formData.affinity_opt_in}
                onChange={(event) => handleAffinityToggle(event.target.checked)}
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

            {formData.affinity_opt_in && (
              <AffinityMatchingSettings
                value={affinityProfile}
                onChange={handleAffinityProfileChange}
              />
            )}
          </div>
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
          disabled={isPastLocalDate(date)}
          className={`${uiStyles.successButton} flex min-h-[42px] sm:min-h-12 w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold group active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <span>{mode === "group" ? "Recommend Group Seats" : "Find My Best Seat"}</span>
          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
        </button>
      </form>

      {/* Affinity Matching Limited Availability Decision Modal */}
      {showAffinityWarningModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/45 animate-in fade-in duration-200"
          onClick={() => setShowAffinityWarningModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="affinity-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.35)" }}
            className="relative z-[101] w-full max-w-md sm:max-w-lg overflow-hidden rounded-2xl sm:rounded-3xl border border-ui-border bg-ui-surface p-5 sm:p-7 animate-in zoom-in-95 duration-200"
          >
            {/* Header Icon + Notice Badge */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20">
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/40 px-3 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>1 Seat Remaining</span>
              </span>
            </div>

            {/* Content */}
            <div className="mt-4 sm:mt-5">
              <h3 id="affinity-modal-title" className="text-lg sm:text-xl font-extrabold text-ui-foreground">
                No Affinity Matches Available
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ui-muted-foreground">
                There is only <strong>1 seat remaining</strong> on this bus. Because neighboring seats are already reserved, we cannot guarantee an optimal affinity match for your selected travel habits and language preferences.
              </p>
              <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/80 p-3 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                You can proceed to secure this final seat without affinity matching, or search for another bus departure to find your preferred seatmate match.
              </div>
            </div>

            {/* Action Buttons: Responsive side-by-side or stacked */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/buy?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&date=${date}`
                  )
                }
                className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ui-border bg-ui-surface px-4 py-2.5 text-xs sm:text-sm font-semibold text-ui-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs active:scale-[0.98] cursor-pointer"
              >
                <Search className="h-4 w-4 text-ui-muted-foreground" aria-hidden />
                <span>Find Another Bus</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAffinityWarningModal(false);
                  proceedToSeatSelection();
                }}
                className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ui-primary px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-blue-600 transition-all shadow-md shadow-ui-primary/20 active:scale-[0.98] cursor-pointer"
              >
                <span>Continue Anyway</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
