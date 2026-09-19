"use client";

import Link from "next/link";
import { ArrowLeft, Gift, Search, TicketPercent } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { uiStyles } from "@/lib/design-system";

const UPCOMING_REWARDS = [
  "Earn points for on-time boarding",
  "Operator promos can appear here",
  "Discounts stay hidden until available",
];

export default function PromoPage() {
  return (
    <div className={`${uiStyles.pageContainer} max-w-4xl !space-y-3 sm:!space-y-5 !px-3 sm:!px-6 !py-3 sm:!py-6`}>
      <div>
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ui-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to Account
        </Link>
      </div>

      <PageHeader
        eyebrow="Promos"
        title="Rewards & Discounts"
        description="Exclusive travel vouchers, operator discounts, and boarding rewards for your trips."
        actions={
          <Link
            href="/buy"
            className={`${uiStyles.primaryButton} inline-flex min-h-10 sm:min-h-11 items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-sm`}
          >
            <Search className="h-4 w-4" aria-hidden />
            <span>Search Buses</span>
          </Link>
        }
      />

      <section className={`${uiStyles.surface} flex flex-col items-center justify-center p-5 sm:p-8 text-center`}>
        {/* Proportionate Responsive Icon Container */}
        <div className="mb-4 sm:mb-5 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl border border-orange-200/80 bg-orange-50/90 shadow-inner dark:border-orange-900/40 dark:bg-orange-950/30">
          <Gift className="h-8 w-8 sm:h-10 sm:w-10 text-brand-orange" aria-hidden />
        </div>

        <h2 className="text-base sm:text-xl font-bold text-ui-foreground">
          No promos available right now
        </h2>

        <p className="mt-1.5 max-w-md text-xs sm:text-sm leading-5 sm:leading-6 text-ui-muted-foreground">
          The passenger app is ready for rewards, but this prototype keeps promo redemption out of scope.
        </p>

        {/* Feature Hints: Responsive compact list */}
        <div className="mt-4 sm:mt-5 grid w-full max-w-sm gap-2">
          {UPCOMING_REWARDS.map((reward) => (
            <div
              key={reward}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200/60 bg-ui-surface px-3 py-2 text-xs sm:text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300 shadow-2xs text-left"
            >
              <TicketPercent className="h-4 w-4 text-brand-orange shrink-0" />
              <span>{reward}</span>
            </div>
          ))}
        </div>

        <Link
          href="/buy"
          className={`${uiStyles.primaryButton} mt-5 sm:mt-6 inline-flex min-h-10 items-center justify-center gap-2 text-xs sm:text-sm font-bold text-center active:scale-[0.98] transition-all`}
        >
          <Search className="h-4 w-4" aria-hidden />
          <span>Search & Book Buses</span>
        </Link>
      </section>
    </div>
  );
}
