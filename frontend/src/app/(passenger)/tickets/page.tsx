"use client";

import { useEffect, useState } from "react";
import { Search, Ticket } from "lucide-react";
import Link from "next/link";
import BoardingPassCard from "@/components/boarding/BoardingPassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getSavedBoardingPasses,
  type SavedBoardingPass,
} from "@/lib/boarding-passes";
import { glassStyles } from "@/lib/design-system";

export default function TicketsPage() {
  const [passes, setPasses] = useState<SavedBoardingPass[]>([]);

  useEffect(() => {
    function refreshPasses() {
      setPasses(getSavedBoardingPasses());
    }

    refreshPasses();
    window.addEventListener("focus", refreshPasses);

    return () => {
      window.removeEventListener("focus", refreshPasses);
    };
  }, []);

  return (
    <div className={`${glassStyles.pageContainer} max-w-4xl`}>
      <PageHeader
        eyebrow="My tickets"
        title="Upcoming trips"
        description={
          passes.length > 0
            ? "Saved QR boarding passes available on this device."
            : "Confirmed QR boarding passes will appear here after booking."
        }
        actions={
          <Link
            href="/buy"
            className={`${glassStyles.primaryButton} inline-flex min-h-11 items-center justify-center gap-2 font-bold`}
          >
            <Search className="h-4 w-4" aria-hidden />
            Find a Bus
          </Link>
        }
      />

      {passes.length > 0 ? (
        <div className="space-y-5">
          {passes.map((pass) => (
            <BoardingPassCard key={pass.id} booking={pass} savedCopy />
          ))}
        </div>
      ) : (
        <section className={`${glassStyles.panel} flex min-h-[420px] flex-col items-center justify-center p-8 text-center`}>
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-blue-100 bg-blue-50 shadow-inner dark:border-blue-900/40 dark:bg-blue-950/30">
            <Ticket className="h-10 w-10 text-brand-blue" aria-hidden />
          </div>
          <h2 className="text-xl font-bold text-foreground">No active tickets</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
            This demo account has no saved trip history yet. Book a ticket to
            generate an offline-scannable QR boarding pass.
          </p>
        </section>
      )}
    </div>
  );
}
