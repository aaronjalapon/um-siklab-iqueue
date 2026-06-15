"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, WifiOff } from "lucide-react";
import BoardingPassCard from "@/components/boarding/BoardingPassCard";
import { BookingProgress } from "@/components/ui/BookingProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getSavedBoardingPassById,
  saveBoardingPass,
} from "@/lib/boarding-passes";
import { getBooking } from "@/lib/api";
import { glassStyles } from "@/lib/design-system";
import type { BookingDetail } from "@/lib/types";

export default function ConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavedCopy, setIsSavedCopy] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    let cancelled = false;

    getBooking(bookingId)
      .then((data) => {
        if (cancelled) return;
        setBooking(data);
        setIsSavedCopy(false);
        setError(null);
        saveBoardingPass(data);
      })
      .catch((err: Error) => {
        const savedPass = getSavedBoardingPassById(bookingId);
        if (cancelled) return;
        if (savedPass) {
          setBooking(savedPass);
          setIsSavedCopy(true);
          setError(null);
          return;
        }
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
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

      {isSavedCopy && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="font-semibold">
            Showing the saved boarding pass from this device.
          </p>
        </div>
      )}

      <BoardingPassCard booking={booking} savedCopy={isSavedCopy} />
    </div>
  );
}
