"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Smartphone, WifiOff, Zap, X } from "lucide-react";
import { BRAND } from "@/lib/brand";
import {
  cleanupDevelopmentPwaState,
  PWA_INSTALL_DISMISS_KEY,
  PWA_INSTALL_REQUEST_EVENT,
  shouldEnablePwaClientRuntime,
} from "@/lib/pwa-runtime";

const DISMISS_TTL_MS = 1000 * 60 * 60 * 24;
const PROMPT_DELAY_MS = 1200;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type InstallGuide = {
  title: string;
  description: string;
  steps: string[];
  note?: string;
};

const GENERIC_INSTALL_GUIDE: InstallGuide = {
  title: "Install from your browser",
  description: "Use your browser's app installation option:",
  steps: [
    "Open the browser menu.",
    "Choose Install app or Add to Home Screen.",
    "Confirm the installation.",
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
  const isChromium = /Chrome|CriOS|Chromium/i.test(userAgent) || isEdge;
  const isSafari =
    /Safari/i.test(userAgent) &&
    !/Chrome|CriOS|Chromium|Edg|EdgiOS|EdgA|OPR|Firefox|FxiOS/i.test(
      userAgent
    );

  if (isAppleMobile) {
    if (!isSafari) {
      return {
        title: `Open ${BRAND.name} in Safari first`,
        description:
          "iPhone and iPad install web apps through Safari, even when you opened this page in another browser.",
        steps: [
          "Copy this page's address and open it in Safari.",
          "Tap Share, then choose Add to Home Screen.",
          "Turn on Open as Web App, then tap Add.",
        ],
      };
    }

    return {
      title: `Add ${BRAND.name} to your Home Screen`,
      description: `Safari installs ${BRAND.name} from its Share menu:`,
      steps: [
        "Tap the Share button in Safari.",
        "Scroll down and choose Add to Home Screen.",
        "Turn on Open as Web App, then tap Add.",
      ],
    };
  }

  if (isAndroid) {
    return {
      title: `Install ${BRAND.name} on Android`,
      description: isFirefox
        ? `Firefox installs ${BRAND.name} from its browser menu:`
        : `Your browser installs ${BRAND.name} from its app menu:`,
      steps: [
        "Tap the browser menu (usually ⋮).",
        isFirefox
          ? "Choose Install."
          : "Choose Install app or Add to Home Screen.",
        "Confirm Install or Add.",
      ],
    };
  }

  if (isSafari) {
    return {
      title: `Add ${BRAND.name} to your Mac Dock`,
      description: `Safari can save ${BRAND.name} as a web app:`,
      steps: [
        "Open the File menu in Safari.",
        "Choose Add to Dock.",
        "Confirm the app name, then click Add.",
      ],
      note: "If Add to Dock is unavailable, update Safari or use Chrome or Edge.",
    };
  }

  if (isFirefox) {
    return {
      title: `Open ${BRAND.name} in Chrome or Edge`,
      description:
        "Desktop Firefox does not currently provide a PWA installation action.",
      steps: [
        "Open this page in Chrome or Microsoft Edge.",
        "Select the install icon in the address bar, or open the browser menu.",
        `Choose Install ${BRAND.name} and confirm.`,
      ],
    };
  }

  if (isChromium) {
    return {
      title: `Install ${BRAND.name} from the browser menu`,
      description:
        "The automatic prompt is not available yet, but you can use the browser menu:",
      steps: [
        "Open the Chrome or Edge menu (⋮).",
        `Choose Install ${BRAND.name} or Apps → Install this site as an app.`,
        "Confirm Install.",
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

function wasDismissedRecently() {
  if (typeof window === "undefined") return false;

  let dismissedAt: string | null = null;

  try {
    dismissedAt = window.localStorage.getItem(PWA_INSTALL_DISMISS_KEY);
  } catch {
    return false;
  }

  if (!dismissedAt) return false;

  const parsed = Number(dismissedAt);
  if (!Number.isFinite(parsed)) return false;

  return Date.now() - parsed < DISMISS_TTL_MS;
}

export default function PWARegistrar() {
  const shouldEnablePwa = shouldEnablePwaClientRuntime();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallVisible, setIsInstallVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  const shouldShowInstallPrompt = useMemo(
    () => isInstallVisible,
    [isInstallVisible]
  );

  const requestNativeInstall = useCallback(async () => {
    if (!deferredPrompt) {
      setShowManualInstructions(true);
      setIsInstallVisible(true);
      return;
    }

    setIsInstalling(true);
    setShowManualInstructions(false);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      setDeferredPrompt(null);

      if (outcome === "accepted") {
        setIsInstallVisible(false);
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
      setIsInstallVisible(false);
    } catch {
      setShowManualInstructions(true);
      setIsInstallVisible(true);
    } finally {
      setIsInstalling(false);
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
    if (!shouldEnablePwa || typeof window === "undefined") return;

    let visibilityTimer: number | null = null;

    function handleBeforeInstallPrompt(event: Event) {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();

      if (isStandaloneMode() || wasDismissedRecently()) return;

      if (visibilityTimer !== null) {
        window.clearTimeout(visibilityTimer);
        visibilityTimer = null;
      }

      setDeferredPrompt(installEvent);
      setShowManualInstructions(false);
      setIsInstallVisible(true);
    }

    function handleInstalled() {
      try {
        window.localStorage.removeItem(PWA_INSTALL_DISMISS_KEY);
      } catch {
        // Ignore storage failures for the install banner state.
      }
      setDeferredPrompt(null);
      setIsInstallVisible(false);
      setIsInstalling(false);
      setShowManualInstructions(false);
    }

    if (isStandaloneMode()) return;

    if (!wasDismissedRecently()) {
      visibilityTimer = window.setTimeout(() => {
        setShowManualInstructions(true);
        setIsInstallVisible(true);
      }, PROMPT_DELAY_MS);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      if (visibilityTimer !== null) {
        window.clearTimeout(visibilityTimer);
      }
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [shouldEnablePwa]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleInstallRequest() {
      if (isStandaloneMode()) return;

      try {
        window.localStorage.removeItem(PWA_INSTALL_DISMISS_KEY);
      } catch {
        // Ignore storage failures for an explicit install request.
      }

      if (deferredPrompt) {
        void requestNativeInstall();
        return;
      }

      setShowManualInstructions(true);
      setIsInstallVisible(true);
    }

    window.addEventListener(PWA_INSTALL_REQUEST_EVENT, handleInstallRequest);

    return () => {
      window.removeEventListener(PWA_INSTALL_REQUEST_EVENT, handleInstallRequest);
    };
  }, [deferredPrompt, requestNativeInstall]);

  function handleDismiss() {
    try {
      window.localStorage.setItem(
        PWA_INSTALL_DISMISS_KEY,
        String(Date.now())
      );
    } catch {
      // Ignore storage failures for the install banner state.
    }
    setShowManualInstructions(false);
    setIsInstallVisible(false);
  }

  if (!shouldShowInstallPrompt) return null;

  const installGuide = getInstallGuide();

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-description"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl shadow-slate-950/40 dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="h-1.5 bg-gradient-to-r from-brand-blue via-cyan-400 to-brand-orange" />
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Dismiss install message"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-4 pr-10">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-lg shadow-brand-blue/30">
              <Smartphone className="h-7 w-7" aria-hidden />
              <span className="absolute -right-1 -top-1 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-white bg-brand-orange dark:border-slate-900" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-blue">
                {BRAND.name} mobile app
              </p>
              <h2
                id="pwa-install-title"
                className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white sm:text-2xl"
              >
                Install {BRAND.name} on this device
              </h2>
            </div>
          </div>

          <p
            id="pwa-install-description"
            className="text-sm leading-6 text-slate-600 dark:text-slate-300"
          >
            Keep your trips and boarding passes one tap away, even when the
            terminal connection is unreliable.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-3 py-3 text-sm font-semibold text-slate-700 dark:bg-blue-950/30 dark:text-slate-200">
              <Zap className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden />
              Faster access
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-3 text-sm font-semibold text-slate-700 dark:bg-orange-950/25 dark:text-slate-200">
              <WifiOff
                className="h-4 w-4 shrink-0 text-brand-orange"
                aria-hidden
              />
              Offline passes
            </div>
          </div>

          {showManualInstructions && (
            <div
              className="mt-4 rounded-2xl border border-brand-blue/20 bg-blue-50 p-4 text-sm leading-5 text-slate-700 dark:border-brand-blue/30 dark:bg-blue-950/30 dark:text-slate-200"
              role="status"
              aria-live="polite"
            >
              <p className="font-bold text-slate-950 dark:text-white">
                {installGuide.title}
              </p>
              <p className="mt-1">{installGuide.description}</p>
              <ol className="mt-3 space-y-2">
                {installGuide.steps.map((step, index) => (
                  <li key={step} className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              {installGuide.note && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {installGuide.note}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-2.5 sm:grid-cols-[1fr_auto]">
            {deferredPrompt ? (
              <>
                <button
                  type="button"
                  onClick={() => void requestNativeInstall()}
                  disabled={isInstalling}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-blue/30 transition hover:bg-blue-600 hover:shadow-brand-blue/45 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                >
                  <Download className="h-5 w-5" aria-hidden />
                  {isInstalling ? "Opening install prompt..." : `Install ${BRAND.name}`}
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  Maybe later
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-blue px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-blue/30 transition hover:bg-blue-600 active:scale-[0.98] sm:col-span-2"
              >
                Got it
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
