"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, ArrowRight, ShieldAlert, X } from "lucide-react";

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      aria-describedby="cancel-modal-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65  overscroll-contain transition-all animate-in fade-in duration-200 select-none touch-none"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        className="clay-surface-raised relative w-full max-w-md touch-auto select-text overflow-hidden overscroll-contain rounded-3xl border border-ui-border bg-ui-surface p-5 transition-[opacity,transform] sm:p-6"
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
          <div className="flex h-12 w-12 sm:h-13 sm:w-13 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 ring-8 ring-amber-500/5">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <ShieldAlert className="h-3 w-3" aria-hidden />
              Booking in progress
            </span>
            <h3
              id="cancel-modal-title"
              className="mt-1.5 text-base sm:text-lg font-bold text-ui-foreground leading-snug"
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
        <div className="mt-5 flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="clay-control clay-interactive w-full sm:w-auto sm:flex-1 py-2.5 sm:py-3 px-4 rounded-xl border border-red-200 bg-red-50/80 hover:bg-red-100 text-red-600 font-semibold text-xs sm:text-sm dark:border-red-900/50 dark:bg-red-950/30 dark:hover:bg-red-950/60 dark:text-red-300 text-center"
          >
            Leave & Discard
          </button>
          <button
            ref={stayButtonRef}
            type="button"
            onClick={onCancel}
            className="clay-action w-full sm:w-auto sm:flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 text-center"
          >
            <span>Continue Booking</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
