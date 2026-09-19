"use client";

import React, { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Coffee,
  Compass,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

export type SocialOpenness = "yes" | "maybe" | "quiet";
export type ConversationLevel = "quiet" | "occasional" | "social";
export type StartingConversation = "initiate" | "respond" | "flexible";
export type ConversationStyle = "casual" | "humorous" | "thoughtful" | "professional";
export type MatchPriority = "must_have" | "nice_to_have" | "flexible";
export type RhythmPreference = "morning" | "night" | "flexible";
export type TravelFrequency = "frequent" | "occasional";
export type LocalStatus = "local" | "domestic" | "international";
export type CabinEnv = "quiet" | "social" | "flexible";

export interface AffinityProfile {
  // High-value Core signals
  socialOpenness: SocialOpenness;
  conversationLevel: ConversationLevel;
  spokenLanguages: string[];
  interests: string[]; // up to 5 tags
  dislikes: string[]; // practical boundaries
  matchPriority: MatchPriority;

  // 1. Conversation preferences
  startingConversation?: StartingConversation;
  conversationStyle?: ConversationStyle;
  avoidTopics?: string[];

  // 2. Lifestyle and travel context
  travelPurpose?: string;
  passengerType?: string;
  rhythm?: RhythmPreference;
  travelFrequency?: TravelFrequency;
  localStatus?: LocalStatus;
  travelGroup?: "solo" | "group";

  // 3. Seatmate compatibility & boundaries
  cabinEnvironment?: CabinEnv;
  eatingComfort?: "okay" | "prefer_not";
  fragranceComfort?: "okay" | "fragrance_free";
  phoneComfort?: "okay" | "prefer_quiet";
  sleepTrip?: "sleep" | "awake" | "flexible";
  nearChildrenComfort?: "okay" | "adults_preferred";
  nearPetsComfort?: "okay" | "distance_preferred";

  // 4. Optional demographic context (Voluntary & safe)
  ageRange?: string;
  hometown?: string;
  professionOrSchool?: string;
}

export const DEFAULT_AFFINITY_PROFILE: AffinityProfile = {
  socialOpenness: "maybe",
  conversationLevel: "occasional",
  spokenLanguages: ["fil", "en"],
  interests: ["Coffee", "Travel", "Technology"],
  dislikes: ["quiet_calls"],
  matchPriority: "nice_to_have",
  startingConversation: "flexible",
  conversationStyle: "casual",
  avoidTopics: ["Politics"],
  travelPurpose: "Vacation / Leisure",
  passengerType: "Working Professional",
  rhythm: "flexible",
  travelFrequency: "occasional",
  localStatus: "domestic",
  travelGroup: "solo",
  cabinEnvironment: "flexible",
  eatingComfort: "okay",
  fragranceComfort: "fragrance_free",
  phoneComfort: "prefer_quiet",
  sleepTrip: "flexible",
  nearChildrenComfort: "okay",
  nearPetsComfort: "okay",
  ageRange: "",
  hometown: "",
  professionOrSchool: "",
};

const INTEREST_TAGS = [
  "Coffee",
  "Anime",
  "Basketball",
  "Business",
  "K-pop",
  "Technology",
  "Travel",
  "Books",
  "Quiet conversations",
  "Music",
  "Gaming",
  "Food & Dining",
  "Movies & Series",
  "Fitness & Outdoors",
  "Art & Design",
  "Photography",
  "Science & Nature",
  "Podcasts",
];

const DISLIKE_OPTIONS = [
  { id: "quiet_calls", label: "Phone calls: Prefer quiet" },
  { id: "fragrance_free", label: "Fragrances: Prefer fragrance-free" },
  { id: "eating_smell", label: "Eating: Prefer no strong-smelling food" },
  { id: "sleep_undisturbed", label: "Sleeping: Light sleeper (undisturbed)" },
  { id: "loud_audio", label: "Audio: Headphones only (no loud speaker)" },
];

const LANGUAGE_OPTIONS = [
  { code: "fil", label: "Filipino (Tagalog)" },
  { code: "en", label: "English" },
  { code: "ceb", label: "Cebuano (Bisaya)" },
  { code: "ilo", label: "Ilocano" },
  { code: "hil", label: "Hiligaynon" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "id", label: "Bahasa Indonesia" },
];

const AVOID_TOPICS = [
  "Politics",
  "Work stress",
  "Personal finances",
  "Controversial debates",
  "Personal relationships",
];

const TRAVEL_PURPOSES = [
  "Vacation / Leisure",
  "Work / Business",
  "School / University",
  "Visiting Family",
  "Event / Festival",
];

const PASSENGER_TYPES = [
  "Student",
  "Working Professional",
  "Retiree",
  "Traveler / Backpacker",
  "Entrepreneur / Creator",
];

const AGE_RANGES = ["18–24", "25–34", "35–49", "50+"];

interface AffinityMatchingSettingsProps {
  value: AffinityProfile;
  onChange: (updated: AffinityProfile) => void;
}

export function AffinityMatchingSettings({
  value,
  onChange,
}: AffinityMatchingSettingsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);
  const [limitNotice, setLimitNotice] = useState(false);

  function update<K extends keyof AffinityProfile>(
    key: K,
    val: AffinityProfile[K]
  ) {
    onChange({ ...value, [key]: val });
  }

  function toggleInterest(tag: string) {
    const exists = value.interests.includes(tag);
    if (exists) {
      update(
        "interests",
        value.interests.filter((item) => item !== tag)
      );
      setLimitNotice(false);
    } else {
      if (value.interests.length >= 5) {
        setLimitNotice(true);
        setTimeout(() => setLimitNotice(false), 2200);
        return;
      }
      update("interests", [...value.interests, tag]);
    }
  }

  function toggleDislike(id: string) {
    const exists = value.dislikes.includes(id);
    if (exists) {
      update(
        "dislikes",
        value.dislikes.filter((item) => item !== id)
      );
    } else {
      update("dislikes", [...value.dislikes, id]);
    }
  }

  function toggleLanguage(code: string) {
    const exists = value.spokenLanguages.includes(code);
    if (exists) {
      // Keep at least one language
      if (value.spokenLanguages.length > 1) {
        update(
          "spokenLanguages",
          value.spokenLanguages.filter((item) => item !== code)
        );
      }
    } else {
      update("spokenLanguages", [...value.spokenLanguages, code]);
    }
  }

  function toggleAvoidTopic(topic: string) {
    const current = value.avoidTopics || [];
    if (current.includes(topic)) {
      update(
        "avoidTopics",
        current.filter((t) => t !== topic)
      );
    } else {
      update("avoidTopics", [...current, topic]);
    }
  }

  return (
    <div className="mt-3 space-y-3.5 sm:space-y-4 rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/70 to-slate-50/60 p-2.5 sm:p-5 dark:border-blue-900/40 dark:from-blue-950/20 dark:to-slate-900/40 transition-all w-full min-w-0 max-w-full overflow-hidden box-border">
      {/* Header with Priority Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-blue-100 pb-3 dark:border-blue-900/30 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm dark:bg-blue-500">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-ui-foreground flex flex-wrap items-center gap-1.5">
              <span>Affinity Matching Preferences</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                Active
              </span>
            </h3>
            <p className="text-[11px] text-ui-muted-foreground truncate sm:whitespace-normal">
              Pairs you with compatible travelers based on vibe, language, and comfort.
            </p>
          </div>
        </div>

        {/* 3 levels: Must have / Nice to have / Doesn't matter */}
        <div className="flex items-center gap-1 self-start sm:self-auto flex-wrap min-w-0">
          <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mr-1 shrink-0">
            Priority:
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-medium dark:border-slate-800 dark:bg-slate-900 max-w-full overflow-x-auto">
            {(
              [
                { id: "must_have", label: "Must have" },
                { id: "nice_to_have", label: "Nice to have" },
                { id: "flexible", label: "Doesn't matter" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => update("matchPriority", opt.id)}
                className={`rounded-md px-2 py-1 transition-all whitespace-nowrap text-[10px] sm:text-[11px] cursor-pointer ${
                  value.matchPriority === opt.id
                    ? "bg-blue-600 text-white font-semibold shadow-xs dark:bg-blue-500"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HIGH-VALUE QUICK QUESTIONS SECTION                                       */}
      {/* ========================================================================= */}
      <div className="space-y-3 sm:space-y-4 min-w-0">
        {/* Q1 & Q2: Social Seatmate & Talkativeness */}
        <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 min-w-0">
          {/* Question 1: Social Seatmate */}
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-2.5 sm:p-3 dark:border-slate-800/80 dark:bg-slate-900/60 min-w-0">
            <label className="block text-xs font-semibold text-ui-foreground mb-1.5">
              1. Would you like a social seatmate?
            </label>
            <div className="grid grid-cols-3 gap-1 min-w-0">
              {(
                [
                  { id: "yes", label: "Yes", icon: Smile },
                  { id: "maybe", label: "Maybe", icon: Coffee },
                  { id: "quiet", label: "Prefer quiet", icon: VolumeX },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = value.socialOpenness === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("socialOpenness", opt.id)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2 px-1 text-[10px] sm:text-[11px] font-medium transition-all cursor-pointer min-w-0 ${
                      active
                        ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 font-semibold shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate w-full text-center">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question 2: Talkative Level */}
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-2.5 sm:p-3 dark:border-slate-800/80 dark:bg-slate-900/60 min-w-0">
            <label className="block text-xs font-semibold text-ui-foreground mb-1.5">
              2. How talkative would you like them to be?
            </label>
            <div className="grid grid-cols-3 gap-1 min-w-0">
              {(
                [
                  { id: "quiet", label: "Quiet" },
                  { id: "occasional", label: "Occasional" },
                  { id: "social", label: "Very social" },
                ] as const
              ).map((opt) => {
                const active = value.conversationLevel === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("conversationLevel", opt.id)}
                    className={`rounded-lg border py-2 px-1 text-center text-[10px] sm:text-[11px] font-medium transition-all cursor-pointer min-w-0 ${
                      active
                        ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 font-semibold shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
                    }`}
                  >
                    <span className="truncate block w-full">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Question 3: Languages Comfortable Speaking */}
        <div className="rounded-xl border border-slate-200/80 bg-white/80 p-2.5 sm:p-3 dark:border-slate-800/80 dark:bg-slate-900/60 min-w-0">
          <label className="block text-xs font-semibold text-ui-foreground mb-1.5">
            3. Which languages are you comfortable speaking?{" "}
            <span className="font-normal text-slate-400 dark:text-slate-500">
              (Multi-select)
            </span>
          </label>
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {LANGUAGE_OPTIONS.map((lang) => {
              const active = value.spokenLanguages.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => toggleLanguage(lang.code)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all cursor-pointer ${
                    active
                      ? "border-blue-600 bg-blue-600 text-white font-medium shadow-xs dark:border-blue-500 dark:bg-blue-500"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {active && <Check className="h-3 w-3 shrink-0" />}
                  <span>{lang.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question 4: Choose up to 5 interests */}
        <div className="rounded-xl border border-slate-200/80 bg-white/80 p-2.5 sm:p-3 dark:border-slate-800/80 dark:bg-slate-900/60 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
            <label className="text-xs font-semibold text-ui-foreground">
              4. Choose up to five interests
            </label>
            <div className="flex items-center gap-1.5">
              {limitNotice && (
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
                  Max 5 reached
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  value.interests.length >= 5
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                }`}
              >
                {value.interests.length} / 5 selected
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 min-w-0">
            {INTEREST_TAGS.map((tag) => {
              const active = value.interests.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleInterest(tag)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all active:scale-95 cursor-pointer ${
                    active
                      ? "border-blue-600 bg-blue-600 text-white font-medium shadow-xs dark:border-blue-500 dark:bg-blue-500"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {active && <Check className="h-3 w-3 shrink-0" />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question 5: What would make you uncomfortable? (Trip boundaries) */}
        <div className="rounded-xl border border-slate-200/80 bg-white/80 p-2.5 sm:p-3 dark:border-slate-800/80 dark:bg-slate-900/60 min-w-0">
          <label className="block text-xs font-semibold text-ui-foreground mb-0.5">
            5. What would make you uncomfortable during the trip?
          </label>
          <p className="text-[11px] text-ui-muted-foreground mb-2">
            Select personal boundaries so the algorithm avoids incompatible pairings.
          </p>
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {DISLIKE_OPTIONS.map((opt) => {
              const active = value.dislikes.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleDislike(opt.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all cursor-pointer ${
                    active
                      ? "border-rose-500 bg-rose-50 text-rose-700 font-medium dark:border-rose-500 dark:bg-rose-950/40 dark:text-rose-300"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {active ? (
                    <VolumeX className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                  )}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COLLAPSIBLE ADVANCED SETTINGS ACCORDION                                    */}
      {/* ========================================================================= */}
      <div className="pt-1 w-full min-w-0">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full min-w-0 items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 sm:px-3 sm:py-2.5 text-xs font-semibold text-ui-foreground hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-left"
        >
          <div className="flex min-w-0 items-center gap-2 pr-2">
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-ui-primary" />
            <div className="min-w-0">
              <span className="block font-semibold">Advanced Affinity Settings</span>
              <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500 truncate sm:whitespace-normal">
                (Conversation style, travel rhythm, cabin boundaries & voluntary context)
              </span>
            </div>
          </div>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          )}
        </button>

        {showAdvanced && (
          <div className="mt-2.5 space-y-3 rounded-xl border border-slate-200 bg-white/95 p-2.5 sm:p-3.5 dark:border-slate-800 dark:bg-slate-900/90 animate-fadeIn w-full min-w-0 max-w-full overflow-hidden box-border">
            {/* Subsection navigation tabs (clean horizontal scroll without stretching) */}
            <div className="flex w-full min-w-0 overflow-x-auto gap-1 border-b border-slate-100 pb-2 dark:border-slate-800 scrollbar-none text-xs touch-pan-x">
              {[
                { id: 1 as const, label: "1. Conversation", icon: MessageSquare },
                { id: 2 as const, label: "2. Travel", icon: Compass },
                { id: 3 as const, label: "3. Compatibility", icon: Volume2 },
                { id: 4 as const, label: "4. Demographics", icon: ShieldCheck },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? "bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: CONVERSATION PREFERENCES */}
            {activeTab === 1 && (
              <div className="space-y-3 text-xs min-w-0">
                <div className="min-w-0">
                  <label className="font-semibold text-ui-foreground block mb-1">
                    Comfortable starting conversations?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 min-w-0">
                    {[
                      { id: "initiate", label: "Yes, I like starting" },
                      { id: "respond", label: "Prefer other person to start" },
                      { id: "flexible", label: "Either way / Flexible" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          update(
                            "startingConversation",
                            opt.id as StartingConversation
                          )
                        }
                        className={`rounded-lg border p-2 text-center text-[11px] transition-all cursor-pointer min-w-0 break-words ${
                          value.startingConversation === opt.id
                            ? "border-blue-600 bg-blue-50 font-semibold text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="font-semibold text-ui-foreground block mb-1">
                    Conversation style
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1.5 min-w-0">
                    {[
                      { id: "casual", label: "Casual & lighthearted" },
                      { id: "humorous", label: "Humorous & fun" },
                      { id: "thoughtful", label: "Thoughtful & deep" },
                      { id: "professional", label: "Professional & networking" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          update("conversationStyle", opt.id as ConversationStyle)
                        }
                        className={`rounded-lg border p-2 text-center text-[11px] transition-all cursor-pointer min-w-0 break-words ${
                          value.conversationStyle === opt.id
                            ? "border-blue-600 bg-blue-50 font-semibold text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="font-semibold text-ui-foreground block mb-1">
                    Topics you prefer to avoid
                  </label>
                  <div className="flex flex-wrap gap-1.5 min-w-0">
                    {AVOID_TOPICS.map((topic) => {
                      const active = (value.avoidTopics || []).includes(topic);
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => toggleAvoidTopic(topic)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition-all cursor-pointer ${
                            active
                              ? "border-rose-400 bg-rose-50 font-medium text-rose-700 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {active ? "✕ " : ""}{topic}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LIFESTYLE & TRAVEL CONTEXT */}
            {activeTab === 2 && (
              <div className="space-y-3 text-xs min-w-0">
                <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 min-w-0">
                  <div className="min-w-0">
                    <label className="font-semibold text-ui-foreground block mb-1">
                      Travel purpose
                    </label>
                    <select
                      value={value.travelPurpose || ""}
                      onChange={(e) => update("travelPurpose", e.target.value)}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 text-xs text-ui-foreground dark:border-slate-700 dark:bg-slate-800"
                    >
                      {TRAVEL_PURPOSES.map((purpose) => (
                        <option key={purpose} value={purpose}>
                          {purpose}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="font-semibold text-ui-foreground block mb-1">
                      Passenger profile
                    </label>
                    <select
                      value={value.passengerType || ""}
                      onChange={(e) => update("passengerType", e.target.value)}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 text-xs text-ui-foreground dark:border-slate-700 dark:bg-slate-800"
                    >
                      {PASSENGER_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-3 min-w-0">
                  <div className="min-w-0">
                    <label className="font-semibold text-ui-foreground block mb-1">
                      Rhythm & habit
                    </label>
                    <div className="grid grid-cols-3 gap-1 min-w-0">
                      {[
                        { id: "morning", label: "Morning ☀️" },
                        { id: "night", label: "Night 🌙" },
                        { id: "flexible", label: "Any" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => update("rhythm", opt.id as RhythmPreference)}
                          className={`rounded-lg border py-1.5 px-0.5 text-center text-[10px] font-medium transition-all cursor-pointer min-w-0 truncate ${
                            value.rhythm === opt.id
                              ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                              : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="font-semibold text-ui-foreground block mb-1">
                      Travel frequency
                    </label>
                    <div className="grid grid-cols-2 gap-1 min-w-0">
                      {[
                        { id: "frequent", label: "Frequent" },
                        { id: "occasional", label: "Occasional" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            update("travelFrequency", opt.id as TravelFrequency)
                          }
                          className={`rounded-lg border py-1.5 px-0.5 text-center text-[10px] font-medium transition-all cursor-pointer min-w-0 truncate ${
                            value.travelFrequency === opt.id
                              ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                              : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="font-semibold text-ui-foreground block mb-1">
                      Travel party
                    </label>
                    <div className="grid grid-cols-2 gap-1 min-w-0">
                      {[
                        { id: "solo", label: "Solo" },
                        { id: "group", label: "In group" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            update("travelGroup", opt.id as "solo" | "group")
                          }
                          className={`rounded-lg border py-1.5 px-0.5 text-center text-[10px] font-medium transition-all cursor-pointer min-w-0 truncate ${
                            value.travelGroup === opt.id
                              ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                              : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SEATMATE COMPATIBILITY & BOUNDARIES */}
            {activeTab === 3 && (
              <div className="space-y-3 text-xs min-w-0">
                <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 min-w-0">
                  <div className="min-w-0">
                    <label className="font-semibold text-ui-foreground block mb-1">
                      Preferred cabin environment
                    </label>
                    <div className="grid grid-cols-3 gap-1 min-w-0">
                      {[
                        { id: "quiet", label: "Quiet" },
                        { id: "social", label: "Social" },
                        { id: "flexible", label: "Any" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            update("cabinEnvironment", opt.id as CabinEnv)
                          }
                          className={`rounded-lg border py-1.5 px-0.5 text-center text-[10px] font-medium transition-all cursor-pointer min-w-0 truncate ${
                            value.cabinEnvironment === opt.id
                              ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                              : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="font-semibold text-ui-foreground block mb-1">
                      Sleeping during the trip
                    </label>
                    <div className="grid grid-cols-3 gap-1 min-w-0">
                      {[
                        { id: "sleep", label: "Sleep" },
                        { id: "awake", label: "Awake" },
                        { id: "flexible", label: "Flexible" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            update(
                              "sleepTrip",
                              opt.id as "sleep" | "awake" | "flexible"
                            )
                          }
                          className={`rounded-lg border py-1.5 px-0.5 text-center text-[10px] font-medium transition-all cursor-pointer min-w-0 truncate ${
                            value.sleepTrip === opt.id
                              ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                              : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 min-w-0">
                  <div className="min-w-0">
                    <label className="font-semibold text-ui-foreground block mb-1">
                      Sitting near children / families?
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 min-w-0">
                      {[
                        { id: "okay", label: "Yes, comfortable" },
                        { id: "adults_preferred", label: "Prefer adult seating" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            update(
                              "nearChildrenComfort",
                              opt.id as "okay" | "adults_preferred"
                            )
                          }
                          className={`rounded-lg border p-1.5 text-center text-[11px] font-medium transition-all cursor-pointer min-w-0 break-words ${
                            value.nearChildrenComfort === opt.id
                              ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                              : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="font-semibold text-ui-foreground block mb-1">
                      Around service animals / pets?
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 min-w-0">
                      {[
                        { id: "okay", label: "Comfortable" },
                        { id: "distance_preferred", label: "Prefer distance" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            update(
                              "nearPetsComfort",
                              opt.id as "okay" | "distance_preferred"
                            )
                          }
                          className={`rounded-lg border p-1.5 text-center text-[11px] font-medium transition-all cursor-pointer min-w-0 break-words ${
                            value.nearPetsComfort === opt.id
                              ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                              : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: OPTIONAL DEMOGRAPHIC CONTEXT (SAFE & VOLUNTARY) */}
            {activeTab === 4 && (
              <div className="space-y-3 text-xs min-w-0">
                {/* Privacy Guarantee Alert */}
                <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 sm:p-3 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 min-w-0">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-[11px] leading-relaxed min-w-0 break-words">
                    <strong>100% Voluntary & Safe:</strong> Demographic details are
                    strictly optional and used solely to discover shared journeys (such
                    as alumni or fellow travelers). Siklab iQueue never filters or
                    discriminates by religion, ethnicity, gender identity, or disability.
                  </div>
                </div>

                <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-3 min-w-0">
                  <div className="min-w-0">
                    <label className="font-semibold text-ui-foreground block mb-1">
                      Age range / Life stage{" "}
                      <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    <select
                      value={value.ageRange || ""}
                      onChange={(e) => update("ageRange", e.target.value)}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 text-xs text-ui-foreground dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="">Prefer not to say</option>
                      {AGE_RANGES.map((age) => (
                        <option key={age} value={age}>
                          {age}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="font-semibold text-ui-foreground block mb-1">
                      Hometown / City{" "}
                      <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Davao, CDO, Manila"
                      value={value.hometown || ""}
                      onChange={(e) => update("hometown", e.target.value)}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-ui-foreground outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="font-semibold text-ui-foreground block mb-1">
                      School or Profession{" "}
                      <span className="font-normal text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UM, Tech, Nursing"
                      value={value.professionOrSchool || ""}
                      onChange={(e) => update("professionOrSchool", e.target.value)}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-ui-foreground outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
