import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { glassStyles } from "@/lib/design-system";
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
  const subtitle =
    data?.subtitle ||
    (data?.route ? `${data.route} · Gate Pass` : `Booking Code: ${code}`);

  async function handleDownload() {
    if (!qrRef.current) return;
    setDownloading(true);
    await downloadQrAsPng(qrRef.current, {
      filename: `TripSync-Pass-${code}`,
      subtitle,
      seatInfo,
    });
    setDownloading(false);
  }

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
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-t-3xl border border-glass-border bg-white p-4 sm:p-6 pt-3 sm:pt-4 shadow-2xl dark:bg-slate-900 md:bottom-6 md:rounded-3xl max-h-[92dvh] overflow-y-auto overscroll-contain"
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
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
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
          <div ref={qrRef} className="mb-4 sm:mb-6 rounded-2xl border border-slate-100 bg-white p-3 sm:p-4 shadow-sm">
            <QRCodeSVG value={qrToken} size={176} marginSize={2} className="w-40 h-40 sm:w-48 sm:h-48" />
          </div>

          <p className="mb-0.5 text-xs sm:text-sm font-medium text-slate-500">
            Booking code
          </p>
          <p className="mb-1 text-xl sm:text-2xl font-bold tracking-wider text-slate-900 dark:text-white">
            {code}
          </p>
          {seatInfo && (
            <p className="mb-3 sm:mb-4 text-xs font-semibold text-brand-blue">
              {seatInfo}
            </p>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="mb-3 sm:mb-4 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-brand-orange" />
            <span>{downloading ? "Saving..." : "Download QR Pass"}</span>
          </button>

          <p className="px-4 text-center text-xs sm:text-sm leading-5 sm:leading-6 text-slate-500 dark:text-slate-400">
            Scan this QR code at the terminal gate during your assigned
            boarding window.
          </p>

          <button
            type="button"
            onClick={onClose}
            className={`${glassStyles.primaryButton} mt-4 sm:mt-6 min-h-10 sm:min-h-11 w-full font-bold`}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
