import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle, Clock, Download, MapPin, ShieldCheck, Ticket, WifiOff } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { glassStyles } from "@/lib/design-system";
import { downloadQrAsPng } from "@/lib/qr-download";
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
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const routeOrigin = booking.route_origin || "Origin";
  const routeDestination = booking.route_destination || "Destination";

  async function handleDownload() {
    if (!qrContainerRef.current) return;
    setDownloading(true);
    await downloadQrAsPng(qrContainerRef.current, {
      filename: `TripSync-Boarding-Pass-${booking.id.slice(0, 8)}`,
      subtitle: `${routeOrigin} → ${routeDestination} · Seat ${booking.seat_number}`,
      seatInfo: `Seat: ${booking.seat_number} · Passenger: ${booking.passenger_name || "Confirmed"}`,
    });
    setDownloading(false);
  }

  return (
    <section className={`${glassStyles.panel} overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-glass-border p-3 sm:p-5">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400">
            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-bold text-foreground truncate">
              {BRAND.name} Boarding Pass
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">ID {booking.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {savedCopy && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <WifiOff className="h-3 w-3" aria-hidden />
              <span>Saved</span>
            </span>
          )}
          <span
            className={`${glassStyles.badge} text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 ${statusColorClass(
              booking.status
            )}`}
          >
            {booking.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-5 p-3 sm:p-5 md:grid-cols-[1fr_250px]">
        <div className="space-y-2.5 sm:space-y-3">
          <div className="rounded-xl bg-white/60 p-2.5 sm:p-4 dark:bg-slate-900/40">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Route
            </p>
            <p className="mt-0.5 sm:mt-1 flex items-center gap-1.5 text-xs sm:text-base font-bold text-foreground truncate">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-brand-blue" aria-hidden />
              <span>{routeOrigin} → {routeDestination}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-xl bg-white/60 p-2.5 sm:p-4 dark:bg-slate-900/40">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Seat
              </p>
              <p className="mt-0.5 sm:mt-1 flex items-center gap-1.5 text-lg sm:text-2xl font-black text-brand-blue">
                <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-brand-orange shrink-0" aria-hidden />
                <span>{booking.seat_number}</span>
              </p>
            </div>
            <div className="rounded-xl bg-white/60 p-2.5 sm:p-4 dark:bg-slate-900/40">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Departure
              </p>
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold text-foreground truncate">
                {formatDate(booking.departure_date)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-brand-orange/30 bg-orange-50/70 px-3 py-2 sm:px-3.5 sm:py-2.5 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100">
            <p className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold shrink-0">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-brand-orange" aria-hidden />
              <span>Boarding window</span>
            </p>
            <p className="text-[11px] sm:text-xs font-extrabold text-brand-orange tracking-tight shrink-0">
              {formatBoardingWindow(
                booking.boarding_window_start,
                booking.boarding_window_end
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-3.5 sm:p-5 text-center shadow-sm dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
          <div className="mb-2 sm:mb-2.5 inline-flex items-center gap-1 rounded-full bg-slate-100/90 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <ShieldCheck className="h-3 w-3 text-brand-blue" />
            <span>Encrypted Offline Pass</span>
          </div>
          <div ref={qrContainerRef} role="img" aria-label={`QR boarding pass for seat ${booking.seat_number}`} className="rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-3 shadow-xs">
            <QRCodeSVG value={getQrValue(booking)} size={184} marginSize={2} className="w-44 h-44 sm:w-48 sm:h-48" level="M" />
          </div>
          <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">Scan at Terminal Gate</p>
          <p className="mt-0.5 text-[11px] font-semibold text-brand-blue">
            Seat {booking.seat_number} · {booking.passenger_name || "Confirmed"}
          </p>
          <p className="mt-1 text-[10px] sm:text-[11px] text-slate-400 max-w-[220px]">
            Offline-verified by gate scanner · Present at boarding gate
          </p>
          
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="mt-3 sm:mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 sm:py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-800 active:scale-95 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-orange" />
            <span>{downloading ? "Saving Pass..." : "Download QR Pass"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
