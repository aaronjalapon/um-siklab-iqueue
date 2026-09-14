"use client";

import { useRouter } from "next/navigation";
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
import { clearSessionPasses } from "@/lib/session-bookings";

const MENU_ITEMS = [
  {
    icon: User,
    label: "Personal Information",
    description: "Demo passenger profile & details",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    icon: Languages,
    label: "Language Preferences",
    description: "Filipino, English, Bahasa, Tiếng Việt",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    icon: CreditCard,
    label: "Payment Methods",
    description: "Cashless & terminal counter checkout",
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-500/10",
  },
  {
    icon: Settings,
    label: "Settings & Accessibility",
    description: "Priority alerts & screen defaults",
    color: "text-slate-500",
    bg: "bg-slate-100 dark:bg-slate-800",
  },
  {
    icon: HelpCircle,
    label: "Help Center & Assistant",
    description: "AI booking assistant support 24/7",
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-500/10",
  },
];

export default function AccountPage() {
  const router = useRouter();

  function handleLogout() {
    clearSessionPasses();
    router.replace("/#hero");
  }

  return (
    <div className={`${glassStyles.pageContainer} max-w-4xl !space-y-3 sm:!space-y-5 !px-3 sm:!px-6 !py-3 sm:!py-6`}>
      <PageHeader
        eyebrow="Account"
        title="Demo Passenger"
        description="Profile and preferences are local demo states for the hackathon build."
      />

      <section className={`${glassStyles.panel} overflow-hidden`}>
        {/* Responsive Profile Header */}
        <div className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-brand-blue text-white shadow-md shadow-brand-blue/20">
            <User className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                Demo Passenger
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
                <span>Prototype profile</span>
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
              passenger.demo@tripsync.local
            </p>
          </div>
        </div>

        {/* Responsive Menu Items */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className="flex w-full items-center justify-between gap-3 p-3 sm:p-4 text-left transition hover:bg-slate-50/70 dark:hover:bg-slate-800/45 active:scale-[0.99]"
              >
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
                  <div
                    className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ${item.bg}`}
                  >
                    <Icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${item.color}`} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs sm:text-sm font-semibold text-foreground truncate">
                      {item.label}
                    </span>
                    <span className="block text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.description}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-slate-400" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Log Out Button */}
      <button
        type="button"
        onClick={handleLogout}
        className="flex min-h-[42px] sm:min-h-11 w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl border border-red-200 bg-red-50/90 px-4 text-xs sm:text-sm font-bold text-red-600 transition hover:bg-red-100 active:scale-[0.98] dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200 shadow-2xs"
      >
        <LogOut className="h-4 w-4 sm:h-4.5 sm:w-4.5" aria-hidden />
        <span>Log Out</span>
      </button>
    </div>
  );
}
