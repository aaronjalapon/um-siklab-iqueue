"use client";

import { X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { glassStyles } from "@/lib/design-system";

export default function TicketModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close ticket"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-t-3xl border border-glass-border bg-white p-6 pt-4 shadow-2xl dark:bg-slate-900 md:bottom-6 md:rounded-3xl"
      >
        <div className="mb-4 flex justify-center md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3
              id="ticket-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Your E-ticket
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Demo QR boarding pass
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-4">
          <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <QRCodeSVG value="BUS01150224" size={200} />
          </div>

          <p className="mb-1 text-sm font-medium text-slate-500">
            Booking code
          </p>
          <p className="mb-6 text-2xl font-bold tracking-wider text-slate-900 dark:text-white">
            BUS01150224
          </p>

          <p className="px-4 text-center text-sm leading-6 text-slate-500 dark:text-slate-400">
            Scan this QR code at the terminal gate during your assigned
            boarding window.
          </p>

          <button
            type="button"
            onClick={onClose}
            className={`${glassStyles.primaryButton} mt-6 min-h-11 w-full font-bold`}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
