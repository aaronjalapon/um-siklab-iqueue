"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, ArrowRight, X } from "lucide-react";

interface CancelTransactionModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  targetLabel?: string;
}

export function CancelTransactionModal({
  isOpen,
  onConfirm,
  onCancel,
  targetLabel,
}: CancelTransactionModalProps) {
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Lock document body and html scrolling
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    // 2. Prevent mobile touchmove scroll leakage / rubber-banding on background
    const preventTouch = (e: TouchEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    window.addEventListener("touchmove", preventTouch, { passive: false });

    // Focus safe action on open
    const timer = setTimeout(() => {
      stayButtonRef.current?.focus();
    }, 50);

    // Escape key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchmove", preventTouch);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.touchAction = originalBodyTouchAction;
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/45 overscroll-contain transition-all animate-in fade-in duration-200 select-none touch-none"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        aria-describedby="cancel-modal-description"
        style={{ boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.35)" }}
        className="relative z-[101] w-full max-w-md touch-auto select-text overflow-hidden overscroll-contain rounded-2xl sm:rounded-3xl border border-ui-border bg-ui-surface p-5 sm:p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          aria-label="Close dialog and keep booking"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5 sm:gap-4">
          {/* Warning Icon Pill */}
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Booking in progress</span>
            </span>
            <h3
              id="cancel-modal-title"
              className="mt-2 text-lg sm:text-xl font-extrabold text-ui-foreground leading-snug"
            >
              Stop this booking transaction?
            </h3>
          </div>
        </div>

        <p
          id="cancel-modal-description"
          className="mt-3 text-xs sm:text-sm leading-relaxed text-ui-muted-foreground"
        >
          You are currently in the middle of booking your trip. If you navigate away
          {targetLabel ? ` to ${targetLabel}` : ""}, your entered preferences, passenger details, and allocated seats will not be saved.
        </p>

        {/* Release warning callout */}
        <div className="mt-3.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-[11px] sm:text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold flex items-center gap-1.5">
            <span>Seat allocations will be released immediately.</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto sm:flex-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/80 hover:bg-red-100 text-red-600 font-semibold text-xs sm:text-sm dark:border-red-900/50 dark:bg-red-950/30 dark:hover:bg-red-950/60 dark:text-red-300 transition-colors shadow-2xs active:scale-[0.98] cursor-pointer"
          >
            Leave & Discard
          </button>
          <button
            ref={stayButtonRef}
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto sm:flex-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ui-primary px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-blue-600 transition-all shadow-md shadow-ui-primary/20 active:scale-[0.98] cursor-pointer"
          >
            <span>Continue Booking</span>
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
