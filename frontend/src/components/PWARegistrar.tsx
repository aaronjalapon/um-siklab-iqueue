"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  Menu,
  Plus,
  Share2,
  Smartphone,
  WifiOff,
  Zap,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BRAND } from "@/lib/brand";
import {
  cleanupDevelopmentPwaState,
  PWA_INSTALL_DISMISS_KEY,
  PWA_INSTALL_REQUEST_EVENT,
  shouldEnablePwaClientRuntime,
} from "@/lib/pwa-runtime";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type InstallStepIcon =
  | "share"
  | "add"
  | "menu"
  | "install"
  | "file"
  | "copy"
  | "browser";

type InstallStep = {
  icon: InstallStepIcon;
  text: string;
};

type InstallGuide = {
  title: string;
  description: string;
  steps: InstallStep[];
  note?: string;
  canCopyLink?: boolean;
};

const INSTALL_STEP_ICONS: Record<InstallStepIcon, LucideIcon> = {
  share: Share2,
  add: Plus,
  menu: Menu,
  install: Download,
  file: FilePlus2,
  copy: Copy,
  browser: ExternalLink,
};

const GENERIC_INSTALL_GUIDE: InstallGuide = {
  title: "Install from your browser",
  description: "Use your browser's app installation option:",
  steps: [
    { icon: "menu", text: "Open the browser menu." },
    { icon: "install", text: "Choose Install app or Add to Home Screen." },
  ],
};

function getInstallGuide(): InstallGuide {
  if (typeof navigator === "undefined") return GENERIC_INSTALL_GUIDE;

  const userAgent = navigator.userAgent;
  const isAppleMobile =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);
  const isFirefox = /Firefox|FxiOS/i.test(userAgent);
  const isEdge = /Edg|EdgiOS|EdgA/i.test(userAgent);
  const isSamsungInternet = /SamsungBrowser/i.test(userAgent);
  const isChromium =
    /Chrome|CriOS|Chromium|OPR|Opera/i.test(userAgent) ||
    isEdge ||
    isSamsungInternet;
  const isSafari =
    /Safari/i.test(userAgent) &&
    !/Chrome|CriOS|Chromium|Edg|EdgiOS|EdgA|OPR|Opera|Firefox|FxiOS/i.test(
      userAgent
    );

  if (isAppleMobile) {
    return {
      title: `Add ${BRAND.name} to your Home Screen`,
      description: `Use the Share menu in your current browser:`,
      steps: [
        { icon: "share", text: "Tap the Share button." },
        { icon: "add", text: "Choose Add to Home Screen, then tap Add." },
      ],
      note:
        "If Add to Home Screen is not listed, open this page in Safari and repeat these steps.",
    };
  }

  if (isAndroid) {
    return {
      title: `Install ${BRAND.name} on Android`,
      description: `Use your browser's app menu:`,
      steps: [
        { icon: "menu", text: "Tap the browser menu (usually ⋮)." },
        {
          icon: "install",
          text: isFirefox
            ? "Choose Install, then confirm."
            : "Choose Install app or Add to Home Screen, then confirm.",
        },
      ],
      note: isFirefox
        ? `Firefox may add a browser shortcut instead of a standalone app.`
        : undefined,
    };
  }

  if (isSafari) {
    return {
      title: `Add ${BRAND.name} to your Mac Dock`,
      description: `Safari can save ${BRAND.name} as a web app:`,
      steps: [
        { icon: "file", text: "Open the File menu in Safari." },
        { icon: "add", text: "Choose Add to Dock, then click Add." },
      ],
      note:
        "If Add to Dock is unavailable, update Safari or install from Chrome or Edge.",
    };
  }

  if (isFirefox) {
    return {
      title: `Install ${BRAND.name} with a supported desktop browser`,
      description:
        "Desktop Firefox does not currently provide a built-in PWA installation action.",
      steps: [
        {
          icon: "copy",
          text: "Copy this page's link and open it in Chrome or Microsoft Edge.",
        },
        {
          icon: "browser",
          text: `Choose Install ${BRAND.name} in the address bar or browser menu.`,
        },
      ],
      note: `You can continue using ${BRAND.name} in Firefox without installing it.`,
      canCopyLink: true,
    };
  }

  if (isChromium) {
    return {
      title: `Install ${BRAND.name} from the browser menu`,
      description:
        "The automatic prompt is not available yet, but you can use the browser menu:",
      steps: [
        { icon: "menu", text: "Open the Chrome or Edge menu (⋮)." },
        {
          icon: "install",
          text: `Choose Install ${BRAND.name}, then confirm.`,
        },
      ],
    };
  }

  return GENERIC_INSTALL_GUIDE;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export default function PWARegistrar() {
  const shouldEnablePwa = shouldEnablePwaClientRuntime();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallVisible, setIsInstallVisible] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [showInstalledConfirmation, setShowInstalledConfirmation] =
    useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  const shouldShowInstallPrompt = useMemo(
    () => isInstallVisible,
    [isInstallVisible]
  );

  const requestNativeInstall = useCallback(async () => {
    if (!deferredPrompt) {
      setCopyStatus("idle");
      setShowInstalledConfirmation(false);
      setShowManualInstructions(true);
      setIsInstallVisible(true);
      return;
    }

    setIsInstallVisible(false);
    setCopyStatus("idle");
    setShowInstalledConfirmation(false);
    setShowManualInstructions(false);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      setDeferredPrompt(null);

      if (outcome === "accepted") {
        setShowInstalledConfirmation(true);
        setIsInstallVisible(true);
        try {
          window.localStorage.removeItem(PWA_INSTALL_DISMISS_KEY);
        } catch {
          // Ignore storage failures for the install banner state.
        }
        return;
      }

      try {
        window.localStorage.setItem(
          PWA_INSTALL_DISMISS_KEY,
          String(Date.now())
        );
      } catch {
        // Ignore storage failures for the install banner state.
      }
      setShowManualInstructions(true);
      setIsInstallVisible(true);
    } catch {
      setDeferredPrompt(null);
      setShowInstalledConfirmation(false);
      setShowManualInstructions(true);
      setIsInstallVisible(true);
    }
  }, [deferredPrompt]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (!shouldEnablePwa) {
      void cleanupDevelopmentPwaState();
      return;
    }

    let cancelled = false;

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register(
          "/sw.js?pwa=enabled",
          {
            scope: "/",
            updateViaCache: "none",
          }
        );
        if (!cancelled) {
          await registration.update();
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`${BRAND.name} service worker registration failed`, error);
        }
      }
    }

    void registerServiceWorker();

    return () => {
      cancelled = true;
    };
  }, [shouldEnablePwa]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleBeforeInstallPrompt(event: Event) {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();

      if (isStandaloneMode()) return;

      setDeferredPrompt(installEvent);
    }

    function handleInstalled() {
      try {
        window.localStorage.removeItem(PWA_INSTALL_DISMISS_KEY);
      } catch {
        // Ignore storage failures for the install banner state.
      }
      setDeferredPrompt(null);
      setShowInstalledConfirmation(true);
      setIsInstallVisible(true);
      setShowManualInstructions(false);
    }

    if (isStandaloneMode()) return;

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleInstallRequest() {
      try {
        window.localStorage.removeItem(PWA_INSTALL_DISMISS_KEY);
      } catch {
        // Ignore storage failures for an explicit install request.
      }

      if (isStandaloneMode()) {
        setDeferredPrompt(null);
        setCopyStatus("idle");
        setShowManualInstructions(false);
        setShowInstalledConfirmation(true);
        setIsInstallVisible(true);
        return;
      }

      if (deferredPrompt) {
        void requestNativeInstall();
        return;
      }

      setCopyStatus("idle");
      setShowInstalledConfirmation(false);
      setShowManualInstructions(true);
      setIsInstallVisible(true);
    }

    window.addEventListener(PWA_INSTALL_REQUEST_EVENT, handleInstallRequest);

    return () => {
      window.removeEventListener(PWA_INSTALL_REQUEST_EVENT, handleInstallRequest);
    };
  }, [deferredPrompt, requestNativeInstall]);

  const handleDismiss = useCallback(() => {
    try {
      window.localStorage.setItem(
        PWA_INSTALL_DISMISS_KEY,
        String(Date.now())
      );
    } catch {
      // Ignore storage failures for the install banner state.
    }
    setShowInstalledConfirmation(false);
    setShowManualInstructions(false);
    setIsInstallVisible(false);
    setCopyStatus("idle");
  }, []);

  const handleCopyInstallLink = useCallback(async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }, []);

  useEffect(() => {
    if (!shouldShowInstallPrompt) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const dialog = dialogRef.current;
    dialog?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleDismiss();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("hidden"));

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyDown);

    return () => {
      document.removeEventListener("keydown", handleDialogKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [handleDismiss, shouldShowInstallPrompt]);

  if (!shouldShowInstallPrompt) return null;

  const installGuide = getInstallGuide();
  const dialogTitle = showInstalledConfirmation
    ? `${BRAND.name} is already installed`
    : `Install ${BRAND.name} on this device`;
  const dialogDescription = showInstalledConfirmation
    ? `${BRAND.name} is ready to launch from your Home Screen, app launcher, or Dock.`
    : "Keep your trips and boarding passes one tap away, even when the terminal connection is unreliable.";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        aria-describedby="pwa-install-description"
        className="clay-surface-raised relative w-full max-w-lg overflow-hidden rounded-3xl border border-ui-border bg-ui-surface"
      >
        <div className="h-1.5 bg-gradient-to-r from-brand-blue via-cyan-400 to-brand-orange" />
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Dismiss install message"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-4 pr-10">
            <div className="clay-action relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-white">
              <Smartphone className="h-7 w-7" aria-hidden />
              <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-ui-surface bg-brand-orange" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-ui-primary">
                {BRAND.name} mobile app
              </p>
              <h2
                id="pwa-install-title"
                className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white sm:text-2xl"
              >
                {dialogTitle}
              </h2>
            </div>
          </div>

          <p
            id="pwa-install-description"
            className="text-sm leading-6 text-ui-muted-foreground"
          >
            {dialogDescription}
          </p>

          {showInstalledConfirmation ? (
            <div
              className="clay-inset mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-800 dark:text-emerald-200"
              role="status"
              aria-live="polite"
              data-testid="pwa-installed-status"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
              Installed and ready to use.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="clay-inset flex items-center gap-2 rounded-xl border border-ui-border bg-ui-surface-soft px-3 py-3 text-sm font-semibold text-ui-foreground">
                <Zap className="h-4 w-4 shrink-0 text-ui-primary" aria-hidden />
                Faster access
              </div>
              <div className="clay-inset flex items-center gap-2 rounded-xl border border-ui-border bg-ui-surface-soft px-3 py-3 text-sm font-semibold text-ui-foreground">
                <WifiOff
                  className="h-4 w-4 shrink-0 text-brand-orange"
                  aria-hidden
                />
                Offline passes
              </div>
            </div>
          )}

          {showManualInstructions && (
            <div
              className="clay-inset mt-4 rounded-xl border border-ui-primary/25 bg-ui-surface-soft p-4 text-sm leading-5 text-ui-foreground"
              role="status"
              aria-live="polite"
            >
              <p className="font-bold text-slate-950 dark:text-white">
                {installGuide.title}
              </p>
              <p className="mt-1">{installGuide.description}</p>
              <ol className="mt-3 space-y-2">
                {installGuide.steps.map((step) => {
                  const StepIcon = INSTALL_STEP_ICONS[step.icon];
                  return (
                    <li key={step.text} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue text-white">
                        <StepIcon className="h-4 w-4" aria-hidden />
                      </span>
                      <span>{step.text}</span>
                    </li>
                  );
                })}
              </ol>
              {installGuide.note && (
                <p className="mt-3 text-xs text-ui-muted-foreground">
                  {installGuide.note}
                </p>
              )}
              {installGuide.canCopyLink && (
                <button
                  type="button"
                  onClick={() => void handleCopyInstallLink()}
                  className="clay-control clay-interactive mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-ui-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary focus-visible:ring-offset-2"
                >
                  {copyStatus === "copied" ? (
                    <ClipboardCheck className="h-4 w-4" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden />
                  )}
                  {copyStatus === "copied"
                    ? "Link copied"
                    : copyStatus === "failed"
                      ? "Copy unavailable — select the address bar"
                      : "Copy install link"}
                </button>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-2.5 sm:grid-cols-[1fr_auto]">
            {showInstalledConfirmation ? (
              <button
                type="button"
                onClick={handleDismiss}
                className="clay-action inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-blue px-5 py-3 text-sm font-bold text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary focus-visible:ring-offset-2 sm:col-span-2"
              >
                Close
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDismiss}
                className="clay-action inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-blue px-5 py-3 text-sm font-bold text-white hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary focus-visible:ring-offset-2 sm:col-span-2"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
