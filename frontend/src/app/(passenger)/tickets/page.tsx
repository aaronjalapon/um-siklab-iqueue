"use client";

import { useEffect, useState } from "react";
import { Search, Ticket } from "lucide-react";
import Link from "next/link";
import BoardingPassCard from "@/components/boarding/BoardingPassCard";
import GroupBoardingPassCard from "@/components/boarding/GroupBoardingPassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { uiStyles } from "@/lib/design-system";
import { getSessionPasses, type SessionPass } from "@/lib/session-bookings";

export default function TicketsPage() {
  const [passes, setPasses] = useState<SessionPass[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    function refreshPasses() {
      setPasses(getSessionPasses());
    }

    const frame = requestAnimationFrame(() => {
      setMounted(true);
      refreshPasses();
    });
    window.addEventListener("focus", refreshPasses);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("focus", refreshPasses);
    };
  }, []);

  if (!mounted) {
    return (
      <div className={`${uiStyles.pageContainer} max-w-4xl`}>
        <div className="h-28 w-full animate-pulse rounded-2xl bg-slate-200/50 dark:bg-slate-800/50" />
      </div>
    );
  }

  return (
    <div className={`${uiStyles.pageContainer} max-w-4xl`}>
      <PageHeader
        eyebrow="My tickets"
        title="Upcoming trips"
        description={
          passes.length > 0
            ? "Saved QR boarding passes available in this session."
            : "Confirmed QR boarding passes will appear here after booking."
        }
        actions={
          <Link
            href="/buy"
            className={`${uiStyles.primaryButton} inline-flex min-h-11 items-center justify-center gap-2 font-bold`}
          >
            <Search className="h-4 w-4" aria-hidden />
            Find a Bus
          </Link>
        }
      />

      {passes.length > 0 ? (
        <div className="space-y-5">
          {passes.map((pass) =>
            pass.type === "group" ? (
              <GroupBoardingPassCard
                key={pass.booking.group_id}
                booking={pass.booking}
                savedCopy
              />
            ) : (
              <BoardingPassCard
                key={pass.booking.id}
                booking={pass.booking}
                savedCopy
              />
            )
          )}
        </div>
      ) : (
        <section className={`${uiStyles.surface} flex min-h-[380px] flex-col items-center justify-center p-6 sm:p-8 text-center`}>
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-100 bg-blue-50 shadow-inner dark:border-blue-900/40 dark:bg-blue-950/30">
            <Ticket className="h-9 w-9 text-brand-blue" aria-hidden />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">No active tickets</h2>
          <p className="mt-1.5 max-w-sm text-xs sm:text-sm leading-5 sm:leading-6 text-slate-500 dark:text-slate-400">
            You don&apos;t have any booked trips in this session yet. Search routes to review an accessibility-first seat recommendation.
          </p>
          <Link
            href="/buy"
            className={`${uiStyles.primaryButton} mt-5 inline-flex min-h-10 items-center justify-center gap-2 text-xs sm:text-sm font-bold`}
          >
            <Search className="h-4 w-4" aria-hidden />
            <span>Search & Book Buses</span>
          </Link>
        </section>
      )}
    </div>
  );
}
