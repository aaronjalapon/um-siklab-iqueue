"use client";

import { Gift, TicketPercent } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { glassStyles } from "@/lib/design-system";

const DEMO_REWARDS = [
  "Earn points for on-time boarding",
  "Operator promos can appear here",
  "Discounts stay hidden until available",
];

export default function PromoPage() {
  return (
    <div className={`${glassStyles.pageContainer} max-w-4xl`}>
      <PageHeader
        eyebrow="Promos"
        title="Rewards and discounts"
        description="Promo inventory is demo-ready and will show live operator offers when connected."
      />

      <section className={`${glassStyles.panel} grid gap-6 p-6 md:grid-cols-[220px_1fr] md:p-8`}>
        <div className="flex h-44 items-center justify-center rounded-3xl border border-orange-100 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/30">
          <Gift className="h-16 w-16 text-brand-orange" aria-hidden />
        </div>
        <div className="flex flex-col justify-center">
          <h2 className="text-xl font-bold text-foreground">
            No promos available right now
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            The passenger app is ready for rewards, but this prototype keeps
            promo redemption out of scope.
          </p>
          <div className="mt-5 grid gap-2">
            {DEMO_REWARDS.map((reward) => (
              <div
                key={reward}
                className="flex items-center gap-2 rounded-xl bg-white/55 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900/40 dark:text-slate-300"
              >
                <TicketPercent className="h-4 w-4 text-brand-orange" />
                {reward}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
