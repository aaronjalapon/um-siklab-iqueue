"use client";

import { Search, Ticket } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { glassStyles } from "@/lib/design-system";

export default function TicketsPage() {
  return (
    <div className={`${glassStyles.pageContainer} max-w-4xl`}>
      <PageHeader
        eyebrow="My tickets"
        title="Upcoming trips"
        description="Confirmed QR boarding passes will appear here after booking."
      />

      <section className={`${glassStyles.panel} flex min-h-[420px] flex-col items-center justify-center p-8 text-center`}>
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-blue-100 bg-blue-50 shadow-inner dark:border-blue-900/40 dark:bg-blue-950/30">
          <Ticket className="h-10 w-10 text-brand-blue" aria-hidden />
        </div>
        <h2 className="text-xl font-bold text-foreground">No active tickets</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
          This demo account has no saved trip history yet. Book a ticket to
          generate an offline-scannable QR boarding pass.
        </p>
        <Link
          href="/buy"
          className={`${glassStyles.primaryButton} mt-7 inline-flex min-h-11 items-center justify-center gap-2 font-bold`}
        >
          <Search className="h-4 w-4" aria-hidden />
          Find a Bus
        </Link>
      </section>
    </div>
  );
}
