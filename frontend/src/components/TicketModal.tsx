import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { uiStyles } from "@/lib/design-system";
import { downloadQrAsPng } from "@/lib/qr-download";

export interface TicketModalData {
  code: string;
  qrToken?: string | null;
  route?: string;
  seatInfo?: string;
  subtitle?: string;
}

export default function TicketModal({
  onClose,
  data,
}: {
  onClose: () => void;
  data?: TicketModalData | null;
}) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const code = data?.code || "BUS01150224";
  const qrToken = data?.qrToken || "BUS01150224";
  const seatInfo = data?.seatInfo || "Terminal Gate Pass";

  async function handleDownload() {
    if (!qrRef.current) return;
    setDownloading(true);
    let origin = "";
    let dest = "";
    if (data?.route) {
      const parts = data.route.split(/→|->/);
      if (parts.length >= 2) {
        origin = parts[0].trim();
        dest = parts[1].trim();
      }
    }
    await downloadQrAsPng(qrRef.current, {
      filename: `TripSync-Pass-${code}`,
      title: "TripSync Boarding Pass",
      origin: origin || undefined,
      destination: dest || undefined,
      seatInfo,
      bookingRef: `#TS-${code.toUpperCase()}`,
      gateStatus: "Gate Ready",
    });
    setDownloading(false);
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[100] bg-black/45 animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Close ticket"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
        style={{ boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.35)" }}
        className="fixed bottom-0 left-1/2 z-[101] max-h-[92dvh] w-full max-w-md -translate-x-1/2 overflow-y-auto overscroll-contain rounded-t-3xl border border-ui-border bg-ui-surface p-4 pt-3 sm:p-6 sm:pt-4 md:bottom-6 md:rounded-3xl animate-in slide-in-from-bottom-4 duration-200"
      >
        <div className="mb-3 flex justify-center md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div>
            <h3
              id="ticket-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
            >
              Your E-ticket
            </h3>
            <p className="text-xs sm:text-sm text-ui-muted-foreground">
              {data?.route || "Demo QR boarding pass"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 sm:p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-2 sm:py-4">
          <div ref={qrRef} className="clay-surface-low mb-4 sm:mb-6 rounded-2xl border border-slate-100 bg-white p-3 sm:p-4">
            <QRCodeSVG value={qrToken} size={176} marginSize={2} className="w-40 h-40 sm:w-48 sm:h-48" />
          </div>

          <p className="mb-0.5 text-xs sm:text-sm font-medium text-slate-500">
            Booking code
          </p>
          <p className="mb-1 text-xl sm:text-2xl font-bold tracking-wider text-slate-900 dark:text-white">
            {code}
          </p>
          {seatInfo && (
            <p className="mb-3 sm:mb-4 text-xs font-semibold text-ui-primary">
              {seatInfo}
            </p>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="clay-control clay-interactive mb-3 sm:mb-4 flex min-h-11 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 transition-all font-bold text-xs"
          >
            <Download className="h-4 w-4 text-white" />
            <span>{downloading ? "Saving..." : "Download QR Pass"}</span>
          </button>

          <p className="px-4 text-center text-xs sm:text-sm leading-5 sm:leading-6 text-ui-muted-foreground">
            Scan this QR code at the terminal gate during your assigned
            boarding window.
          </p>

          <button
            type="button"
            onClick={onClose}
            className={`${uiStyles.primaryButton} mt-4 sm:mt-6 min-h-10 sm:min-h-11 w-full font-bold`}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
