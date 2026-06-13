"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  Accessibility,
  Armchair,
  ArrowLeft,
  BookOpen,
  Briefcase,
  ChevronRight,
  Heart,
  Languages,
  Phone,
  Shuffle,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { BookingProgress } from "@/components/ui/BookingProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import { glassStyles } from "@/lib/design-system";
import type { PassengerFormData } from "@/lib/types";
import { LANGUAGE_LABELS } from "@/lib/utils";

const TRAVEL_HABITS: {
  value: string;
  label: string;
  Icon: LucideIcon;
}[] = [
  { value: "business", label: "Business", Icon: Briefcase },
  { value: "leisure", label: "Leisure", Icon: Heart },
  { value: "student", label: "Student", Icon: BookOpen },
  { value: "family", label: "Family", Icon: Users },
];

const SEAT_TYPES: {
  value: string;
  label: string;
  Icon: LucideIcon;
}[] = [
  { value: "", label: "No Preference", Icon: Shuffle },
  { value: "window", label: "Window", Icon: Armchair },
  { value: "aisle", label: "Aisle", Icon: Armchair },
];

const SIDES = [
  { value: "", label: "No Preference" },
  { value: "left", label: "Left Side" },
  { value: "right", label: "Right Side" },
];

export default function PreferencesPage() {
  const { busId } = useParams<{ busId: string }>();
  const params = useSearchParams();
  const date = params.get("date") || "";
  const origin = params.get("origin") || "";
  const dest = params.get("dest") || "";
  const router = useRouter();

  const [formData, setFormData] = useState<PassengerFormData>({
    name: "",
    phone: "",
    language_pref: "fil",
    travel_habits: "leisure",
    lifestyle_interests: "",
    accessibility_needs: false,
    preferred_seat_type: "",
    preferred_side: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof PassengerFormData, string>>
  >({});

  function updateField<K extends keyof PassengerFormData>(
    key: K,
    value: PassengerFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof PassengerFormData, string>> = {};
    if (!formData.name.trim()) errs.name = "Name is required";
    if (!formData.phone.trim()) errs.phone = "Phone is required";
    else if (formData.phone.trim().length < 5) {
      errs.phone = "Enter a valid phone number";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const prefParams = new URLSearchParams({
      date,
      origin,
      dest,
      name: formData.name,
      phone: formData.phone,
      language_pref: formData.language_pref,
      travel_habits: formData.travel_habits,
      lifestyle_interests: formData.lifestyle_interests,
      accessibility_needs: String(formData.accessibility_needs),
      preferred_seat_type: formData.preferred_seat_type,
      preferred_side: formData.preferred_side,
    });

    router.push(`/book/${busId}/seat-selection?${prefParams.toString()}`);
  }

  return (
    <div className={`${glassStyles.pageContainer} max-w-3xl`}>
      <Link
        href={`/buy?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&date=${date}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to search
      </Link>

      <BookingProgress current="preferences" />

      <PageHeader
        eyebrow="Passenger profile"
        title="Tell us what makes the trip easier"
        description={
          <>
            IQueue uses this to recommend a seat for{" "}
            <span className="font-semibold text-brand-blue">
              {origin || "your origin"} {"->"} {dest || "your destination"}
            </span>
            {date ? ` on ${date}` : ""}.
          </>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className={`${glassStyles.panel} p-5 md:p-6`}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <UserRound className="h-5 w-5 text-brand-blue" aria-hidden />
            Passenger details
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Full name
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Juan Dela Cruz"
                  className={`${glassStyles.input} w-full pl-9 text-sm ${
                    errors.name ? "border-red-400" : ""
                  }`}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Phone number
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+63 912 345 6789"
                  className={`${glassStyles.input} w-full pl-9 text-sm ${
                    errors.phone ? "border-red-400" : ""
                  }`}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="language"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Preferred language
            </label>
            <div className="relative">
              <Languages className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                id="language"
                value={formData.language_pref}
                onChange={(e) => updateField("language_pref", e.target.value)}
                className={`${glassStyles.input} w-full pl-9 text-sm`}
              >
                {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className={`${glassStyles.panel} p-5 md:p-6`}>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Travel profile
          </h2>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Trip style
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {TRAVEL_HABITS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateField("travel_habits", value)}
                  className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    formData.travel_habits === value
                      ? "border-brand-blue bg-blue-50 text-brand-blue dark:bg-blue-950/30"
                      : "border-glass-border bg-white/40 text-slate-600 hover:border-brand-blue/40 dark:bg-slate-900/30 dark:text-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-4">
            <label
              htmlFor="interests"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Lifestyle interests{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="interests"
              type="text"
              value={formData.lifestyle_interests}
              onChange={(e) =>
                updateField("lifestyle_interests", e.target.value)
              }
              placeholder="music, travel, tech, sports"
              className={`${glassStyles.input} w-full text-sm`}
            />
            <p className="mt-1 text-xs text-slate-400">
              Comma-separated interests help the allocator avoid awkward
              seatmate pairings.
            </p>
          </div>

          <label className="mt-4 flex items-start gap-3 rounded-xl border border-glass-border bg-white/40 p-3 text-sm text-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
            <input
              type="checkbox"
              checked={formData.accessibility_needs}
              onChange={(e) =>
                updateField("accessibility_needs", e.target.checked)
              }
              className="mt-1 rounded border-slate-300"
            />
            <span>
              <span className="flex items-center gap-2 font-medium">
                <Accessibility className="h-4 w-4 text-brand-blue" />
                Accessible seating needed
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Prioritizes front-row or easier-access seats when available.
              </span>
            </span>
          </label>
        </section>

        <section className={`${glassStyles.panel} p-5 md:p-6`}>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Seat preferences
          </h2>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Seat type
            </legend>
            <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3">
              {SEAT_TYPES.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateField("preferred_seat_type", value)}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center text-sm font-medium transition min-[380px]:min-h-20 min-[380px]:flex-col min-[380px]:gap-1 min-[380px]:px-2 ${
                    formData.preferred_seat_type === value
                      ? "border-brand-blue bg-blue-50 text-brand-blue dark:bg-blue-950/30"
                      : "border-glass-border bg-white/40 text-slate-600 hover:border-brand-blue/40 dark:bg-slate-900/30 dark:text-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Bus side
            </legend>
            <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3">
              {SIDES.map((side) => (
                <button
                  key={side.value}
                  type="button"
                  onClick={() => updateField("preferred_side", side.value)}
                  className={`min-h-12 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    formData.preferred_side === side.value
                      ? "border-brand-blue bg-blue-50 text-brand-blue dark:bg-blue-950/30"
                      : "border-glass-border bg-white/40 text-slate-600 hover:border-brand-blue/40 dark:bg-slate-900/30 dark:text-slate-300"
                  }`}
                >
                  {side.label}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        <button
          type="submit"
          className={`${glassStyles.primaryButton} flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold`}
        >
          Find My Best Seat
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
