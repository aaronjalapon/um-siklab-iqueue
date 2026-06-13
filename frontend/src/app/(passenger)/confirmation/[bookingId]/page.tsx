"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, CheckCircle, Clock, MapPin } from "lucide-react";
import { BookingProgress } from "@/components/ui/BookingProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import { getBooking } from "@/lib/api";
import { glassStyles } from "@/lib/design-system";
import type { BookingDetail } from "@/lib/types";
import { formatBoardingWindow, formatDate, statusColorClass } from "@/lib/utils";

export default function ConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    getBooking(bookingId)
      .then(setBooking)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className={`${glassStyles.pageContainer} max-w-2xl`}>
        <BookingProgress current="pass" />
        <div className={`${glassStyles.skeleton} h-10 w-64`} />
        <div className={`${glassStyles.skeleton} h-[520px]`} />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className={`${glassStyles.pageContainer} max-w-lg`}>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
          <p className="font-semibold">Booking not found</p>
          <p className="mt-1 text-sm">{error || "Invalid booking ID"}</p>
          <Link
            href="/buy"
            className="mt-4 inline-block text-sm font-medium text-brand-blue hover:underline"
          >
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${glassStyles.pageContainer} max-w-2xl`}>
      <Link
        href="/home"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back home
      </Link>

      <BookingProgress current="pass" />

      <PageHeader
        eyebrow="Boarding pass"
        title="Booking Confirmed"
        description="Show this QR code at the gate during your assigned boarding window."
      />

      <section className={`${glassStyles.panel} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 border-b border-glass-border p-5">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" aria-hidden />
            <div>
              <h2 className="font-semibold text-foreground">
                IQueue Boarding Pass
              </h2>
              <p className="text-xs text-slate-500">
                ID {booking.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <span
            className={`${glassStyles.badge} ${statusColorClass(
              booking.status
            )}`}
          >
            {booking.status.toUpperCase()}
          </span>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[1fr_240px]">
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/55 p-4 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Route
              </p>
              <p className="mt-1 flex items-center gap-2 text-lg font-bold text-foreground">
                <MapPin className="h-4 w-4 text-brand-blue" aria-hidden />
                {booking.route_origin || "Origin"} {"->"}{" "}
                {booking.route_destination || "Destination"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              <div className="rounded-2xl bg-white/55 p-4 dark:bg-slate-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Seat
                </p>
                <p className="mt-1 text-3xl font-black text-foreground">
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
            <QRCodeSVG
              value={booking.qr_token || JSON.stringify(booking)}
              size={200}
              level="M"
            />
            <p className="mt-3 text-xs font-medium text-slate-500">
              Offline-scannable QR pass
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
