"use client";

import { QRCodeSVG } from "qrcode.react";
import {
  Accessibility,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  Users,
  WifiOff,
} from "lucide-react";
import { BRAND } from "@/lib/brand";
import { glassStyles } from "@/lib/design-system";
import type { GroupBookingResponse } from "@/lib/types";
import { formatBoardingWindow, formatDate } from "@/lib/utils";

export default function GroupBoardingPassCard({
  booking,
  savedCopy = false,
}: {
  booking: GroupBookingResponse;
  savedCopy?: boolean;
}) {
  return (
    <section className={`${glassStyles.panel} overflow-hidden`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-7 w-7 text-green-600" aria-hidden />
          <div>
            <h2 className="font-bold">{BRAND.name} Combined Family Pass</h2>
            <p className="text-xs text-slate-500">Group {booking.group_id.slice(0, 8)} · {booking.members.length} passengers</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
          {savedCopy ? <WifiOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {savedCopy ? "Saved copy" : "Confirmed together"}
        </span>
      </header>

      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/60 p-4 dark:bg-slate-900/40">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Route</p>
              <p className="mt-1 flex items-center gap-2 font-bold"><MapPin className="h-4 w-4 text-brand-blue" /> {booking.route_origin} → {booking.route_destination}</p>
            </div>
            <div className="rounded-xl bg-white/60 p-4 dark:bg-slate-900/40">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Departure</p>
              <p className="mt-1 font-bold">{formatDate(booking.departure_date)}</p>
            </div>
          </div>
          <div className="rounded-xl border border-brand-orange/30 bg-orange-50 p-4 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100">
            <p className="flex items-center gap-2 text-sm font-bold"><Clock3 className="h-4 w-4" /> One synchronized boarding window</p>
            <p className="mt-1 text-sm">{formatBoardingWindow(booking.boarding_window_start, booking.boarding_window_end)}</p>
          </div>
          <div>
            <h3 className="mb-2 flex items-center gap-2 font-bold"><Users className="h-4 w-4" /> Family members</h3>
            <div className="space-y-2">
              {booking.members.map((member, index) => (
                <article key={member.booking_id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${member.accessibility_needs ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "border-slate-200 dark:border-slate-700"}`}>
                  <div>
                    <p className="font-bold"><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[10px] text-white">{index + 1}</span>{member.name}</p>
                    <p className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="capitalize">{member.status}</span>
                      {member.accessibility_needs && <span className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-100"><Accessibility className="h-3.5 w-3.5" /> Accessibility assistance</span>}
                    </p>
                  </div>
                  <div className="text-right"><p className="text-xs font-bold uppercase text-slate-400">Seat</p><p className="text-2xl font-black text-brand-blue">{member.seat_label}</p></div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-4 text-center shadow-sm">
          <div role="img" aria-label={`Combined QR boarding pass for ${booking.members.length} family members`}>
            <QRCodeSVG value={booking.qr_token} size={220} level="M" />
          </div>
          <p className="mt-3 text-xs font-bold text-slate-600">One QR for the whole family</p>
          <p className="mt-1 text-[11px] text-slate-500">Saved pass access works offline. Gate verification in this demo is online.</p>
        </div>
      </div>
    </section>
  );
}
