"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  RotateCcw,
  Ticket,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { uiStyles } from "@/lib/design-system";
import {
  clearSessionPasses,
  getSessionPasses,
  type SessionPass,
} from "@/lib/session-bookings";
import { formatDate, formatBoardingWindow } from "@/lib/utils";

function formatBookingTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Recently";
  }
}

export default function HistoryPage() {
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
    window.addEventListener("storage", refreshPasses);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("focus", refreshPasses);
      window.removeEventListener("storage", refreshPasses);
    };
  }, []);

  function handleClearHistory() {
    if (confirm("Reset booking history? This will clear your current booked trips.")) {
      clearSessionPasses();
      setPasses([]);
    }
  }

  // Derived statistics
  const totalBookings = passes.length;
  const totalPassengers = passes.reduce((acc, p) => {
    if (p.type === "group") return acc + p.booking.members.length;
    return acc + 1;
  }, 0);

  if (!mounted) {
    return (
      <div className={`${uiStyles.pageContainer} max-w-4xl`}>
        <div className="h-28 w-full animate-pulse rounded-2xl bg-slate-200/50 dark:bg-slate-800/50" />
      </div>
    );
  }

  return (
    <div className={`${uiStyles.pageContainer} max-w-4xl !space-y-3 sm:!space-y-5 !px-3 sm:!px-6 !py-3 sm:!py-6`}>
      <PageHeader
        eyebrow="Trip History"
        title="Booking History"
        description="View and manage your confirmed bus bookings and boarding passes."
        actions={
          passes.length > 0 ? (
            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-ui-border bg-ui-surface px-3 py-1.5 text-xs font-semibold text-ui-muted-foreground hover:border-red-300 hover:text-red-600 dark:hover:border-red-900/60 dark:hover:text-red-400 transition-colors shadow-2xs"
              title="Reset booking history"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              <span>Clear History</span>
            </button>
          ) : undefined
        }
      />

      {passes.length > 0 ? (
        <div className="space-y-3.5 sm:space-y-4">
          {/* Summary Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className={`${uiStyles.surface} p-3 sm:p-4 text-left`}>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-ui-muted-foreground">
                Confirmed Trips
              </span>
              <span className="mt-1 block text-lg sm:text-2xl font-black text-ui-foreground">
                {totalBookings}
              </span>
            </div>
            <div className={`${uiStyles.surface} p-3 sm:p-4 text-left`}>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-ui-muted-foreground">
                Passengers
              </span>
              <span className="mt-1 block text-lg sm:text-2xl font-black text-ui-foreground">
                {totalPassengers}
              </span>
            </div>
            <div className={`${uiStyles.surface} col-span-2 sm:col-span-1 p-3 sm:p-4 text-left`}>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-ui-muted-foreground">
                Latest Booking
              </span>
              <span className="mt-1 block text-sm sm:text-base font-bold text-ui-foreground truncate">
                {formatBookingTime(passes[0].saved_at)}
              </span>
            </div>
          </div>

          {/* Booked Passes List */}
          <div className="space-y-3">
            {passes.map((pass, index) => {
              const isGroup = pass.type === "group";
              const booking = pass.booking;
              const origin = booking.route_origin || "Pasay";
              const destination = booking.route_destination || "Baguio";
              const travelDate = booking.departure_date;
              const departureTime = booking.departure_time || "Flexible Departure";
              const passId = isGroup ? pass.booking.group_id : pass.booking.id;
              const confirmationHref = isGroup
                ? `/confirmation/group/${passId}`
                : `/confirmation/${passId}`;

              return (
                <article
                  key={passId || index}
                  className={`${uiStyles.surface} overflow-hidden transition-all hover:border-ui-primary/50 shadow-sm`}
                >
                  {/* Card Header: Ref code, status pill & time */}
                  <div className="flex items-center justify-between border-b border-ui-border/60 bg-ui-surface/50 px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-ui-muted-foreground">
                        #{passId.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" aria-hidden />
                        <span>Confirmed</span>
                      </span>
                      {isGroup && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                          <Users className="h-3 w-3" aria-hidden />
                          <span>Group</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-ui-muted-foreground font-medium">
                      Booked {formatBookingTime(pass.saved_at)}
                    </span>
                  </div>

                  {/* Card Body: Route & Schedule Details */}
                  <div className="p-3.5 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        {/* Route title */}
                        <div className="flex items-center gap-2 font-heading text-base sm:text-xl font-black text-ui-foreground">
                          <span>{origin}</span>
                          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-ui-primary shrink-0" aria-hidden />
                          <span>{destination}</span>
                        </div>

                        {/* Departure & Date meta */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ui-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <CalendarDays className="h-3.5 w-3.5 text-ui-primary shrink-0" aria-hidden />
                            <span>{formatDate(travelDate)}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Clock className="h-3.5 w-3.5 text-ui-primary shrink-0" aria-hidden />
                            <span>{departureTime}</span>
                          </span>
                          {booking.boarding_window_start && (
                            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                              <span>Window:</span>
                              <span>
                                {formatBoardingWindow(
                                  booking.boarding_window_start,
                                  booking.boarding_window_end
                                )}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Seat Badges & Price */}
                      <div className="flex flex-wrap items-center sm:flex-col sm:items-end gap-1.5 sm:gap-2">
                        {isGroup ? (
                          <div className="flex flex-wrap gap-1">
                            {pass.booking.members.map((m) => (
                              <span
                                key={m.booking_id}
                                className="inline-flex items-center rounded-lg bg-ui-surface border border-ui-border px-2 py-0.5 text-xs font-bold text-ui-foreground shadow-2xs"
                              >
                                Seat {m.seat_label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900 px-2.5 py-1 text-xs font-bold text-blue-800 dark:text-blue-300">
                            Seat {pass.booking.seat_number}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Passenger & Actions Footer */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div className="text-xs text-ui-muted-foreground">
                        {isGroup ? (
                          <span className="font-medium">
                            Group Leader: <strong className="text-ui-foreground">{pass.booking.members[0]?.name || "Maria Santos"}</strong> (+{pass.booking.members.length - 1} guests)
                          </span>
                        ) : (
                          <span className="font-medium">
                            Passenger: <strong className="text-ui-foreground">{pass.booking.passenger_name || "Maria Santos"}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href="/tickets"
                          className="inline-flex items-center gap-1 rounded-lg border border-ui-border bg-ui-surface px-2.5 py-1.5 text-xs font-semibold text-ui-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
                        >
                          <Ticket className="h-3.5 w-3.5 text-ui-primary" aria-hidden />
                          <span>My Ticket</span>
                        </Link>
                        <Link
                          href={confirmationHref}
                          className="inline-flex items-center gap-1 rounded-lg bg-ui-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-600 transition-colors shadow-sm shadow-ui-primary/20"
                        >
                          <span>View Boarding Pass</span>
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty State */
        <section className="flex min-h-[360px] sm:min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200/90 bg-slate-50/50 p-8 sm:p-12 text-center dark:border-slate-800/90 dark:bg-slate-900/20">
          <div className="mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border border-slate-200/70 bg-slate-100/80 text-slate-400 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-500">
            <History className="h-8 w-8 sm:h-10 sm:w-10 stroke-[1.75]" aria-hidden />
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-300">
            No booking history yet
          </h2>
          <p className="mt-2 max-w-sm text-xs sm:text-sm leading-relaxed text-slate-400 dark:text-slate-500">
            Your confirmed bus tickets and digital boarding passes will appear here after you book a trip.
          </p>

          <Link
            href="/buy"
            className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-ui-primary px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-600 active:scale-[0.98]"
          >
            <Ticket className="h-4 w-4" aria-hidden />
            <span>Book a Trip</span>
          </Link>
        </section>
      )}
    </div>
  );
}
