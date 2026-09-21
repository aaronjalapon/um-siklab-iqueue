import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Accessibility,
  CheckCircle2,
  Clock3,
  Download,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { uiStyles } from "@/lib/design-system";
import { downloadQrAsPng } from "@/lib/qr-download";
import type { GroupBookingResponse } from "@/lib/types";
import { formatBoardingWindow, formatDate, formatTime } from "@/lib/utils";

export default function GroupBoardingPassCard({
  booking,
}: {
  booking: GroupBookingResponse;
  savedCopy?: boolean;
}) {
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!qrContainerRef.current) return;
    setDownloading(true);
    const seatsList = booking.members.map((m) => m.seat_label).join(", ");
    const leadName = booking.members[0]?.name ? `${booking.members[0].name} (Lead)` : undefined;
    const depTime = booking.departure_date
      ? formatTime(booking.departure_date)
      : booking.boarding_window_start
      ? formatBoardingWindow(booking.boarding_window_start, booking.boarding_window_end).split("→")[0]?.trim()
      : "10:00 PM";

    await downloadQrAsPng(qrContainerRef.current, {
      filename: `TripSync-Group-Pass-${booking.group_id.slice(0, 8)}`,
      title: `${BRAND.name} Combined Group Pass`,
      origin: booking.route_origin,
      destination: booking.route_destination,
      date: formatDate(booking.departure_date),
      departureTime: depTime,
      seatInfo: seatsList,
      passengerCount: booking.members.length,
      passengerName: leadName,
      bookingRef: `#TS-${booking.group_id.slice(0, 8).toUpperCase()}`,
      gateStatus: "Gate Ready",
    });
    setDownloading(false);
  }

  return (
    <section className={`${uiStyles.surface} confirmation-reveal overflow-hidden`}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ui-border p-3 sm:p-5">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-ui-success-surface text-ui-success">
            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-bold text-ui-foreground truncate">{BRAND.name} Combined Group Pass</h2>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">Group {booking.group_id.slice(0, 8)} · {booking.members.length} passengers</p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:gap-5 p-3 sm:p-5 lg:grid-cols-[1fr_270px]">
        {/* Trip Details: Order 1 on mobile, Left Col Row 1 on desktop */}
        <div className="order-1 space-y-2.5 sm:space-y-3 lg:col-start-1 lg:row-start-1">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="clay-inset rounded-xl bg-ui-surface p-2.5 sm:p-4 dark:bg-slate-900/40">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Route</p>
              <p className="mt-0.5 sm:mt-1 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-ui-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-ui-primary" />
                <span className="truncate">{booking.route_origin} → {booking.route_destination}</span>
              </p>
            </div>
            <div className="clay-inset rounded-xl bg-ui-surface p-2.5 sm:p-4 dark:bg-slate-900/40">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Departure</p>
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold text-ui-foreground truncate">
                {formatDate(booking.departure_date)} · {formatTime(booking.departure_date)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-brand-orange/30 bg-orange-50/70 px-3 py-2 sm:px-3.5 sm:py-2.5 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100">
            <p className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold shrink-0">
              <Clock3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-brand-orange" aria-hidden />
              <span>Boarding window</span>
            </p>
            <p className="text-[11px] sm:text-xs font-extrabold text-brand-orange tracking-tight shrink-0">
              {formatBoardingWindow(booking.boarding_window_start, booking.boarding_window_end)}
            </p>
          </div>
        </div>

        {/* QR Code Card: Order 2 on mobile (prominent), Right Col spanning rows 1-2 on desktop */}
        <div className="clay-inset order-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2 flex flex-col items-center justify-center rounded-2xl bg-white p-3.5 sm:p-5 text-center dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
          <div className="mb-2 sm:mb-2.5 inline-flex items-center gap-1 rounded-full bg-slate-100/90 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <ShieldCheck className="h-3 w-3 text-ui-primary" />
            <span>Encrypted Offline Pass</span>
          </div>
          <div ref={qrContainerRef} role="img" aria-label={`Combined QR boarding pass for ${booking.members.length} group members`} className="clay-surface-low rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-3">
            <QRCodeSVG value={booking.qr_token} size={184} marginSize={2} className="w-44 h-44 sm:w-48 sm:h-48" level="M" />
          </div>
          <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">One QR for the whole group</p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1 text-[11px] text-slate-500">
            <span>Assigned Seats:</span>
            <span className="font-bold text-ui-primary">{booking.members.map((m) => m.seat_label).join(", ")}</span>
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] text-slate-400 max-w-[230px]">Offline-verified by gate scanner · Present at boarding gate</p>
          
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="clay-control clay-interactive mt-3 sm:mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 transition-all font-bold text-xs"
          >
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            <span>{downloading ? "Saving Pass..." : "Download QR Pass"}</span>
          </button>
        </div>

        {/* Group Members: Order 3 on mobile, Left Col Row 2 on desktop */}
        <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-2">
          <h3 className="mb-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-ui-foreground">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-ui-primary" />
            <span>Group members ({booking.members.length})</span>
          </h3>
          <div className="space-y-2">
            {booking.members.map((member, index) => (
              <article
                key={member.booking_id}
                className={`flex items-center gap-2.5 sm:gap-3 rounded-xl border p-2.5 sm:p-3 transition-colors ${
                  member.accessibility_needs
                    ? "border-amber-400/60 bg-amber-50/60 dark:border-amber-600/40 dark:bg-amber-950/20"
                    : "border-slate-200/80 bg-ui-surface dark:border-slate-700/60 dark:bg-slate-900/40"
                }`}
              >
                {/* Member Index Avatar */}
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs sm:text-sm font-bold text-white shadow-xs dark:bg-slate-100 dark:text-slate-900">
                  {index + 1}
                </div>

                {/* Member Info: Name + Status Row aligned together */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-ui-foreground truncate">
                    {member.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" aria-hidden />
                      <span className="capitalize">{member.status}</span>
                    </span>
                    {member.accessibility_needs && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100/90 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        <Accessibility className="h-3 w-3 shrink-0" aria-hidden />
                        <span>Priority Seat</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Seat Assignment Column */}
                <div className="shrink-0 text-right pl-2 sm:pl-3 border-l border-slate-200/70 dark:border-slate-700/60">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Seat</p>
                  <p className="text-base sm:text-lg font-black text-ui-primary leading-none mt-0.5">{member.seat_label}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
