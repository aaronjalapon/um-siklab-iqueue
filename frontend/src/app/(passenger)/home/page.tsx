"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  BusFront,
  Clock,
  MapPin,
  QrCode,
  Search,
  Ticket,
  Users,
} from "lucide-react";
import TicketModal, { type TicketModalData } from "@/components/TicketModal";
import { CapacityMeter } from "@/components/ui/CapacityMeter";
import { PageHeader } from "@/components/ui/PageHeader";
import { uiStyles } from "@/lib/design-system";
import { getLatestSessionPass, type SessionPass } from "@/lib/session-bookings";
import { formatBoardingWindow } from "@/lib/utils";

const QUICK_ROUTES = [
  { destination: "Cagayan de Oro", label: "Davao → CDO", seats: 18 },
  { destination: "General Santos", label: "Davao → GenSan", seats: 23 },
  { destination: "Cotabato City", label: "Davao → Cotabato", seats: 12 },
];

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePass, setActivePass] = useState<SessionPass | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    function refreshPass() {
      setActivePass(getLatestSessionPass());
    }

    const frame = requestAnimationFrame(() => {
      setMounted(true);
      refreshPass();
    });
    window.addEventListener("focus", refreshPass);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("focus", refreshPass);
    };
  }, []);

  function buildBuyHref(destination = "") {
    const params = new URLSearchParams({
      origin: "Davao City",
      ...(destination ? { destination } : {}),
    });
    const query = params.toString();
    return query ? `/buy?${query}` : "/buy";
  }

  // Derive dynamic details from the active session pass
  const isGroup = activePass?.type === "group";
  const origin = isGroup
    ? activePass.booking.route_origin
    : activePass?.booking.route_origin || "Davao City";
  const destination = isGroup
    ? activePass.booking.route_destination
    : activePass?.booking.route_destination || "Destination";
  const busPlate = isGroup
    ? (activePass.booking.bus_id ? `BUS-${activePass.booking.bus_id.slice(0, 4).toUpperCase()}` : "DAV-002")
    : "DAV-001";
  const seatsDisplay = isGroup
    ? activePass.booking.members.map((m) => m.seat_label).join(", ")
    : activePass?.booking.seat_number || "14A";
  const boardingWindow = activePass
    ? formatBoardingWindow(
        activePass.booking.boarding_window_start,
        activePass.booking.boarding_window_end
      )
    : "";

  const modalData: TicketModalData | null = activePass
    ? isGroup
      ? {
          code: activePass.booking.group_id.slice(0, 8).toUpperCase(),
          qrToken: activePass.booking.qr_token,
          route: `${origin} → ${destination}`,
          seatInfo: `Seats: ${seatsDisplay} · ${activePass.booking.members.length} Passengers`,
        }
      : {
          code: activePass.booking.id.slice(0, 8).toUpperCase(),
          qrToken: activePass.booking.qr_token,
          route: `${origin} → ${destination}`,
          seatInfo: `Seat ${seatsDisplay} · ${activePass.booking.passenger_name || "Confirmed"}`,
        }
    : null;

  return (
    <div className={`${uiStyles.pageContainer} max-w-7xl`}>
      <PageHeader
        eyebrow="Passenger dashboard"
        title="Good morning, Demo Passenger"
        description="Book faster, keep your QR pass handy, and arrive inside your boarding window."
        actionPosition="top-right"
        actions={
          <button
            type="button"
            className="clay-control clay-interactive relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-ui-border bg-ui-surface text-slate-600 hover:text-ui-primary dark:text-slate-300"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
            <span className="absolute right-2 sm:right-2.5 top-2 sm:top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
          </button>
        }
      />

      {/* Interactive Search Bar */}
      <Link
        href={buildBuyHref()}
        prefetch={false}
        className={`${uiStyles.surface} clay-interactive group flex w-full items-center gap-3 p-3.5 sm:p-4 text-left hover:border-brand-blue/50`}
      >
        <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-ui-primary transition-colors group-hover:bg-brand-blue group-hover:text-white dark:bg-brand-blue/20">
          <Search className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-sm sm:text-base font-bold text-ui-foreground truncate">
            Search routes and seats
          </span>
          <span className="block text-[11px] sm:text-xs text-ui-muted-foreground truncate">
            Origin, destination, date, then AI seat recommendation
          </span>
        </div>
        <div className="shrink-0 text-slate-400 transition group-hover:text-ui-primary group-hover:translate-x-0.5">
          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        </div>
      </Link>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Dynamic Active Ticket Panel: Only renders if a real booking exists in this session */}
        {mounted && activePass ? (
          <section className={`${uiStyles.surface} overflow-hidden`}>
            <div className="flex items-center justify-between gap-2 border-b border-ui-border p-3.5 sm:p-5">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] text-brand-orange">
                  Active {isGroup ? "group pass" : "ticket"}
                </p>
                <h2 className="mt-0.5 text-base sm:text-xl font-bold text-ui-foreground flex items-center gap-1.5 truncate">
                  <span>{origin}</span>
                  <span className="text-slate-400 font-normal">→</span>
                  <span>{destination}</span>
                </h2>
              </div>
              <span className={`${uiStyles.badge} shrink-0 bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 text-[10px] sm:text-xs font-semibold`}>
                Confirmed
              </span>
            </div>

            <div className="grid gap-3.5 sm:gap-5 p-3.5 sm:p-5 md:grid-cols-[1fr_220px]">
              <div className="space-y-3 sm:space-y-4">
                {/* Bus & Seat: Persistent 2-column layout */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="rounded-xl sm:rounded-2xl bg-ui-surface p-2.5 sm:p-4 dark:bg-slate-900/40">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Bus</p>
                    <p className="mt-0.5 sm:mt-1 flex items-center gap-1.5 text-xs sm:text-base font-bold text-ui-foreground">
                      <BusFront className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-ui-primary shrink-0" />
                      <span>{busPlate}</span>
                    </p>
                  </div>
                  <div className="rounded-xl sm:rounded-2xl bg-ui-surface p-2.5 sm:p-4 dark:bg-slate-900/40">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {isGroup ? `Seats (${activePass.booking.members.length})` : "Seat"}
                    </p>
                    <p className="mt-0.5 sm:mt-1 flex items-center gap-1.5 text-xs sm:text-base font-black text-brand-orange truncate">
                      <Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-orange shrink-0" />
                      <span className="truncate">{seatsDisplay}</span>
                    </p>
                  </div>
                </div>

                {/* Horizontal Boarding Window Banner */}
                {boardingWindow && (
                  <div className="rounded-xl sm:rounded-2xl border border-brand-orange/25 bg-orange-50/80 p-2.5 sm:p-3.5 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-brand-orange shrink-0">
                        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span>Boarding window</span>
                      </p>
                      <p className="text-xs sm:text-sm font-extrabold text-brand-orange tracking-tight shrink-0">
                        {boardingWindow}
                      </p>
                    </div>
                    <p className="mt-1 text-[10px] sm:text-xs text-orange-900/80 dark:text-orange-200/80">
                      Arrive at terminal during your window to reduce queue crowding.
                    </p>
                  </div>
                )}

                {/* Occupancy or Group Passenger Summary */}
                {isGroup ? (
                  <div className="rounded-xl sm:rounded-2xl bg-ui-surface p-2.5 sm:p-3.5 dark:bg-slate-900/40">
                    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-ui-primary" />
                      <span>Group Manifest ({activePass.booking.members.length} Members)</span>
                    </p>
                    <p className="mt-1 text-xs text-ui-muted-foreground truncate">
                      {activePass.booking.members.map((m) => `${m.name} (${m.seat_label})`).join(" · ")}
                    </p>
                  </div>
                ) : (
                  <CapacityMeter
                    booked={29}
                    capacity={45}
                    label="Bus occupancy"
                    className="rounded-xl sm:rounded-2xl bg-ui-surface p-2.5 sm:p-4 dark:bg-slate-900/40"
                  />
                )}
              </div>

              {/* Quick Digital QR Pass Card */}
              <div className="clay-surface-low flex flex-col items-center justify-between gap-3 sm:gap-4 rounded-xl sm:rounded-2xl bg-white p-3.5 sm:p-5 text-center border border-slate-100 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center sm:flex-col gap-3 sm:gap-2 w-full sm:w-auto text-left sm:text-center">
                  <div className="flex h-12 w-12 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-800">
                    <QrCode className="h-6 w-6 sm:h-10 sm:w-10" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 sm:flex-initial">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Digital Gate Pass
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-400">
                      Scan at terminal gate
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className={`${uiStyles.primaryButton} min-h-[38px] sm:min-h-11 w-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all`}
                >
                  <QrCode className="h-4 w-4" aria-hidden />
                  <span>Show QR Pass</span>
                </button>
              </div>
            </div>
          </section>
        ) : (
          /* Clean Empty State: When no booking has occurred in this session */
          <section className={`${uiStyles.surface} p-5 sm:p-7 flex flex-col items-center justify-center text-center`}>
            <div className="mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50/80 shadow-inner dark:border-blue-900/40 dark:bg-blue-950/30">
              <Ticket className="h-7 w-7 sm:h-8 sm:w-8 text-ui-primary" aria-hidden />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-ui-foreground">No active trip in this session</h2>
            <p className="mt-1 max-w-md text-xs sm:text-sm leading-5 sm:leading-6 text-ui-muted-foreground">
              Search routes above or pick a route below to experience AI crowd and priority awareness. Your live QR pass will display here as soon as you confirm.
            </p>
            <Link
              href="/buy"
              className={`${uiStyles.primaryButton} mt-4 inline-flex min-h-[38px] sm:min-h-10 items-center justify-center gap-2 text-xs sm:text-sm font-bold`}
            >
              <Search className="h-4 w-4" aria-hidden />
              <span>Book a Trip Now</span>
            </Link>
          </section>
        )}

        {/* Quick Routes Section */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-ui-foreground">Quick routes</h2>
              <p className="text-xs sm:text-sm text-ui-muted-foreground">
                Popular routes with current seat availability
              </p>
            </div>
            <Link
              href="/buy"
              className="text-xs font-semibold text-ui-primary hover:underline shrink-0"
            >
              See all
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5 sm:gap-3">
            {QUICK_ROUTES.map((route) => (
              <Link
                key={route.label}
                href={buildBuyHref(route.destination)}
                prefetch={false}
                className={`${uiStyles.surface} group flex items-center justify-between gap-3 p-3 sm:p-4 text-left transition-all hover:border-brand-blue/50 hover:bg-white/70 dark:hover:bg-slate-900/60 active:scale-[0.99]`}
              >
                <div className="min-w-0 flex-1">
                  <span className="block text-xs sm:text-sm font-bold text-ui-foreground group-hover:text-ui-primary transition-colors truncate">
                    {route.label}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] sm:text-xs text-ui-muted-foreground">
                    <MapPin className="h-3 w-3 text-ui-primary shrink-0" aria-hidden />
                    <span className="font-semibold text-ui-foreground">{route.seats}</span> seats available
                  </span>
                </div>
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-brand-blue group-hover:text-white transition-all">
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <TicketModal onClose={() => setIsModalOpen(false)} data={modalData} />
      )}
    </div>
  );
}
