"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getBooking } from "@/lib/api";
import { formatDate, formatBoardingWindow, statusColorClass } from "@/lib/utils";
import type { BookingDetail } from "@/lib/types";
import { ArrowLeft, CheckCircle, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function ConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    getBooking(bookingId).then(setBooking).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading booking details...</div>;
  if (error || !booking) return (
    <div className="text-center py-12">
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 max-w-md mx-auto">
        <p className="font-semibold">Booking not found</p>
        <p className="text-sm mt-1">{error || "Invalid booking ID"}</p>
        <Link href="/" className="text-blue-600 hover:underline text-sm mt-3 inline-block">Back to search</Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <Link href="/" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mb-2">
        <ArrowLeft className="w-3 h-3" /> Back to search
      </Link>
      <div className="flex items-center gap-2"><CheckCircle className="w-6 h-6 text-green-600" /><h1 className="text-2xl font-bold">Booking Confirmed!</h1></div>
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Boarding Pass</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColorClass(booking.status)}`}>{booking.status.toUpperCase()}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Route</span><p className="font-medium">{booking.route_origin || "—"} → {booking.route_destination || "—"}</p></div>
          <div><span className="text-gray-500">Departure</span><p className="font-medium">{formatDate(booking.departure_date)}</p></div>
          <div><span className="text-gray-500">Seat</span><p className="font-medium text-lg">{booking.seat_number}</p></div>
          <div><span className="text-gray-500">Boarding Window</span><p className="font-medium">{formatBoardingWindow(booking.boarding_window_start, booking.boarding_window_end)}</p></div>
          <div><span className="text-gray-500">Booking ID</span><p className="font-medium text-xs font-mono">{booking.id.slice(0, 8)}...</p></div>
        </div>
        <div className="flex flex-col items-center py-4 border-t">
          <p className="text-sm text-gray-500 mb-3">Scan this QR code at the gate</p>
          <div className="qr-code bg-white p-3 rounded-lg border">
            <QRCodeSVG value={booking.qr_token || JSON.stringify(booking)} size={200} level="M" />
          </div>
        </div>
      </div>
    </div>
  );
}
