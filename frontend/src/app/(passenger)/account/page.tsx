"use client";

import {
  ChevronRight,
  CreditCard,
  HelpCircle,
  Languages,
  LogOut,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { glassStyles } from "@/lib/design-system";

const MENU_ITEMS = [
  {
    icon: User,
    label: "Personal Information",
    description: "Demo passenger profile",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    icon: Languages,
    label: "Language Preferences",
    description: "Filipino, Bahasa, Vietnamese, English",
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-500/10",
  },
  {
    icon: CreditCard,
    label: "Payment Methods",
    description: "Out of scope for prototype",
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-500/10",
  },
  {
    icon: Settings,
    label: "Settings",
    description: "Notification and accessibility defaults",
    color: "text-slate-500",
    bg: "bg-slate-100 dark:bg-slate-800",
  },
  {
    icon: HelpCircle,
    label: "Help Center",
    description: "Use the assistant for booking support",
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-500/10",
  },
];

export default function AccountPage() {
  return (
    <div className={`${glassStyles.pageContainer} max-w-4xl`}>
      <PageHeader
        eyebrow="Account"
        title="Demo Passenger"
        description="Profile and preferences are local demo states for the hackathon build."
      />

      <section className={`${glassStyles.panel} overflow-hidden`}>
        <div className="flex flex-col gap-4 border-b border-glass-border p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-lg shadow-brand-blue/20">
              <User className="h-8 w-8" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Demo Passenger
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                passenger.demo@iqueue.local
              </p>
            </div>
          </div>
          <span className={`${glassStyles.badge} bg-green-100 text-green-800`}>
            <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden />
            Prototype profile
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-white/45 dark:hover:bg-slate-800/45"
              >
                <span className="flex min-w-0 items-center gap-4">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${item.color}`} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">
                      {item.label}
                    </span>
                    <span className="block truncate text-sm text-slate-500 dark:text-slate-400">
                      {item.description}
                    </span>
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </button>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 font-bold text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
      >
        <LogOut className="h-5 w-5" aria-hidden />
        Log Out
      </button>
    </div>
  );
}
