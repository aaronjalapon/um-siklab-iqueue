"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Users } from "lucide-react";
import { LANGUAGE_LABELS } from "@/lib/utils";
import type { PassengerFormData } from "@/lib/types";

const TRAVEL_HABITS = [
  { value: "business", label: "Business", icon: "💼" },
  { value: "leisure", label: "Leisure", icon: "🏖️" },
  { value: "student", label: "Student", icon: "📚" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
];

const SEAT_TYPES = [
  { value: "", label: "No Preference", icon: "🎲" },
  { value: "window", label: "Window", icon: "🪟" },
  { value: "aisle", label: "Aisle", icon: "🚶" },
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

  const [errors, setErrors] = useState<Partial<Record<keyof PassengerFormData, string>>>({});

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
    else if (formData.phone.trim().length < 5) errs.phone = "Enter a valid phone number";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    // Encode preferences as URL params and navigate to seat selection
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

    router.push(
      `/book/${busId}/seat-selection?${prefParams.toString()}`
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Back link */}
      <Link
        href={`/buy?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&date=${date}`}
        className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-3 h-3" /> Back to search
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Your Preferences</h1>
        <p className="text-gray-500 mt-1">
          Help us find the best seat for you.{" "}
          <span className="text-blue-600">
            {origin} → {dest}
          </span>{" "}
          · {date}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <section className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-sm border border-white/20 p-6 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Personal Information
          </h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Juan Dela Cruz"
              className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 ${
                errors.name ? "border-red-400" : "border-slate-300 dark:border-slate-600"
              }`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Phone Number *
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+63 912 345 6789"
              className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-800 ${
                errors.phone ? "border-red-400" : "border-slate-300 dark:border-slate-600"
              }`}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="language" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Preferred Language
            </label>
            <select
              id="language"
              value={formData.language_pref}
              onChange={(e) => updateField("language_pref", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800"
            >
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Travel Profile */}
        <section className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-sm border border-white/20 p-6 space-y-4">
          <h2 className="font-semibold text-lg">Travel Profile</h2>

          <fieldset>
            <legend className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Travel Habit
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {TRAVEL_HABITS.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => updateField("travel_habits", h.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition ${
                    formData.travel_habits === h.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="text-lg">{h.icon}</span>
                  {h.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="interests" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Lifestyle Interests{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="interests"
              type="text"
              value={formData.lifestyle_interests}
              onChange={(e) => updateField("lifestyle_interests", e.target.value)}
              placeholder="music, travel, tech, sports..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800"
            />
            <p className="text-xs text-slate-400 mt-1">
              Comma-separated — helps match you with compatible seatmates
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="accessibility"
              type="checkbox"
              checked={formData.accessibility_needs}
              onChange={(e) => updateField("accessibility_needs", e.target.checked)}
              className="rounded border-slate-300"
            />
            <label htmlFor="accessibility" className="text-sm text-slate-700 dark:text-slate-300">
              ♿ I need accessible seating (priority front-row assignment)
            </label>
          </div>
        </section>

        {/* Seat Preferences */}
        <section className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-sm border border-white/20 p-6 space-y-4">
          <h2 className="font-semibold text-lg">Seat Preferences</h2>

          <fieldset>
            <legend className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Seat Type
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {SEAT_TYPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => updateField("preferred_seat_type", s.value)}
                  className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-sm transition ${
                    formData.preferred_seat_type === s.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="text-lg">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Bus Side Preference
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {SIDES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => updateField("preferred_side", s.value)}
                  className={`px-3 py-2.5 rounded-lg border text-sm transition ${
                    formData.preferred_side === s.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-blue-700 text-white font-semibold py-3 rounded-xl hover:bg-blue-800 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-700/20"
        >
          Find My Best Seat
          <ChevronRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
