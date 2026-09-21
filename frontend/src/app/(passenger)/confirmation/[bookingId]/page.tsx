"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BoardingPassCard from "@/components/boarding/BoardingPassCard";
import { BookingProgress } from "@/components/ui/BookingProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getSavedBoardingPassById,
  saveBoardingPass,
} from "@/lib/boarding-passes";
import { getBooking } from "@/lib/api";
import { uiStyles } from "@/lib/design-system";
import type { BookingDetail } from "@/lib/types";

export default function ConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    let cancelled = false;

    getBooking(bookingId)
      .then((data) => {
        if (cancelled) return;
        setBooking(data);
        setError(null);
        saveBoardingPass(data);
      })
      .catch((err: Error) => {
        const savedPass = getSavedBoardingPassById(bookingId);
        if (cancelled) return;
        if (savedPass) {
          setBooking(savedPass);
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
      <div className={`${uiStyles.pageContainer} max-w-2xl`}>
        <BookingProgress current="pass" />
        <div className={`${uiStyles.skeleton} h-10 w-64`} />
        <div className={`${uiStyles.skeleton} h-[520px]`} />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className={`${uiStyles.pageContainer} max-w-lg`}>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
          <p className="font-semibold">Booking not found</p>
          <p className="mt-1 text-sm">{error || "Invalid booking ID"}</p>
          <Link
            href="/buy"
            className="mt-4 inline-block text-sm font-medium text-ui-primary hover:underline"
          >
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${uiStyles.pageContainer} max-w-2xl`}>
      <Link
        href="/home"
        className="hidden md:inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-ui-primary hover:underline transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
        Back home
      </Link>

      <BookingProgress current="pass" />

      <PageHeader
        eyebrow="Boarding pass"
        title="Booking Confirmed"
        description="Show this QR code at the gate during your assigned boarding window."
      />

      <BoardingPassCard booking={booking} />
    </div>
  );
}
