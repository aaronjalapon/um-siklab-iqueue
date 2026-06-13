"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BusFront,
  Clock,
  MapPin,
  QrCode,
  Search,
  Ticket,
} from "lucide-react";
import TicketModal from "@/components/TicketModal";
import { CapacityMeter } from "@/components/ui/CapacityMeter";
import { PageHeader } from "@/components/ui/PageHeader";
import { glassStyles } from "@/lib/design-system";

const QUICK_ROUTES = [
  { destination: "Cagayan de Oro", label: "Davao -> CDO", seats: 18 },
  { destination: "General Santos", label: "Davao -> GenSan", seats: 23 },
  { destination: "Cotabato City", label: "Davao -> Cotabato", seats: 12 },
];

export default function HomePage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  function openQuickRoute(destination: string) {
    const params = new URLSearchParams({
      origin: "Davao City",
      destination,
    });
    router.push(`/buy?${params.toString()}`);
  }

  return (
    <div className={`${glassStyles.pageContainer} max-w-7xl`}>
      <PageHeader
        eyebrow="Passenger dashboard"
        title="Good morning, Demo Passenger"
        description="Book faster, keep your QR pass handy, and arrive inside your boarding window."
        actions={
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-glass-border bg-glass-bg text-slate-600 shadow-[var(--glass-shadow)] backdrop-blur-xl transition hover:text-brand-blue dark:text-slate-300"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" aria-hidden />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500" />
          </button>
        }
      />

      <button
        type="button"
        onClick={() => router.push("/buy")}
        className={`${glassStyles.panel} flex w-full items-center gap-3 p-4 text-left transition hover:border-brand-blue/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]`}
      >
        <Search className="h-5 w-5 shrink-0 text-brand-blue" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground">
            Search routes and seats
          </span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">
            Origin, destination, date, then AI seat recommendation.
          </span>
        </span>
      </button>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className={`${glassStyles.panel} overflow-hidden`}>
          <div className="flex flex-col gap-3 border-b border-glass-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
                Active ticket
              </p>
              <h2 className="mt-1 text-xl font-bold text-foreground">
                Davao City {"->"} Cagayan de Oro
              </h2>
            </div>
            <span className={`${glassStyles.badge} bg-green-100 text-green-800`}>
              Demo confirmed
            </span>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                <div className="rounded-2xl bg-white/55 p-4 dark:bg-slate-900/40">
                  <p className="text-xs text-slate-400">Bus</p>
                  <p className="mt-1 flex items-center gap-2 font-bold text-foreground">
                    <BusFront className="h-4 w-4 text-brand-blue" />
                    DAV-001
                  </p>
                </div>
                <div className="rounded-2xl bg-white/55 p-4 dark:bg-slate-900/40">
                  <p className="text-xs text-slate-400">Seat</p>
                  <p className="mt-1 flex items-center gap-2 font-bold text-foreground">
                    <Ticket className="h-4 w-4 text-brand-orange" />
                    14A
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-brand-orange/25 bg-orange-50 p-4 text-brand-orange dark:bg-orange-950/20">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <Clock className="h-4 w-4" aria-hidden />
                  Boarding window: 08:00 - 08:15
                </p>
                <p className="mt-1 text-sm">
                  Arrive at Gate 3 during your assigned window to reduce queue
                  crowding.
                </p>
              </div>

              <CapacityMeter
                booked={29}
                capacity={45}
                label="Bus occupancy"
                className="rounded-2xl bg-white/55 p-4 dark:bg-slate-900/40"
              />
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-5 text-center shadow-sm dark:bg-slate-950">
              <QrCode className="mx-auto h-24 w-24 text-slate-900 dark:text-white" />
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className={`${glassStyles.primaryButton} min-h-11 w-full font-bold`}
              >
                Show QR Pass
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Quick routes</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Demo routes with current seat availability.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {QUICK_ROUTES.map((route) => (
              <button
                key={route.label}
                type="button"
                onClick={() => openQuickRoute(route.destination)}
                className={`${glassStyles.panel} flex items-center justify-between gap-3 p-4 text-left transition hover:border-brand-blue/40`}
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">
                    {route.label}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {route.seats} seats available
                  </span>
                </span>
                <Search className="h-5 w-5 shrink-0 text-brand-blue" />
              </button>
            ))}
          </div>
        </section>
      </div>

      {isModalOpen && <TicketModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
