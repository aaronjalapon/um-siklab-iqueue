"use client";

import { QRCodeSVG } from "qrcode.react";
import { CheckCircle, Clock, MapPin, Ticket, WifiOff } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { glassStyles } from "@/lib/design-system";
import type { BookingDetail } from "@/lib/types";
import { formatBoardingWindow, formatDate, statusColorClass } from "@/lib/utils";

interface BoardingPassCardProps {
  booking: BookingDetail;
  savedCopy?: boolean;
  className?: string;
}

function getQrValue(booking: BookingDetail): string {
  return booking.qr_token || JSON.stringify(booking);
}

export default function BoardingPassCard({
  booking,
  savedCopy = false,
  className = "",
}: BoardingPassCardProps) {
  const routeOrigin = booking.route_origin || "Origin";
  const routeDestination = booking.route_destination || "Destination";

  return (
    <section className={`${glassStyles.panel} overflow-hidden ${className}`}>
      <div className="flex flex-col gap-3 border-b border-glass-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600" aria-hidden />
          <div>
            <h2 className="font-semibold text-foreground">
              {BRAND.name} Boarding Pass
            </h2>
            <p className="text-xs text-slate-500">ID {booking.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {savedCopy && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <WifiOff className="h-3.5 w-3.5" aria-hidden />
              Saved
            </span>
          )}
          <span
            className={`${glassStyles.badge} ${statusColorClass(
              booking.status
            )}`}
          >
            {booking.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-[1fr_240px]">
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/55 p-4 dark:bg-slate-900/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Route
            </p>
            <p className="mt-1 flex items-center gap-2 text-lg font-bold text-foreground">
              <MapPin className="h-4 w-4 text-brand-blue" aria-hidden />
              {routeOrigin} {"->"} {routeDestination}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            <div className="rounded-2xl bg-white/55 p-4 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Seat
              </p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-black text-foreground">
                <Ticket className="h-5 w-5 text-brand-orange" aria-hidden />
                {booking.seat_number}
              </p>
            </div>
            <div className="rounded-2xl bg-white/55 p-4 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Departure
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">
                {formatDate(booking.departure_date)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-orange/25 bg-orange-50 p-4 text-brand-orange dark:bg-orange-950/20">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Clock className="h-4 w-4" aria-hidden />
              Boarding window
            </p>
            <p className="mt-1 text-sm">
              {formatBoardingWindow(
                booking.boarding_window_start,
                booking.boarding_window_end
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-4 text-center shadow-sm">
          <QRCodeSVG value={getQrValue(booking)} size={200} level="M" />
          <p className="mt-3 text-xs font-medium text-slate-500">
            Saved pass access works offline; gate verification requires a connection.
          </p>
        </div>
      </div>
    </section>
  );
}
