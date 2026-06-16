"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import {
  cleanupDevelopmentPwaState,
  PWA_INSTALL_DISMISS_KEY,
  SHOULD_ENABLE_PWA,
} from "@/lib/pwa-runtime";

const DISMISS_TTL_MS = 1000 * 60 * 60 * 24;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

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
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallVisible, setIsInstallVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const shouldShowInstallPrompt = useMemo(
    () => SHOULD_ENABLE_PWA && isInstallVisible && deferredPrompt !== null,
    [deferredPrompt, isInstallVisible]
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (!SHOULD_ENABLE_PWA) {
      void cleanupDevelopmentPwaState();
      return;
    }

    let cancelled = false;

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (!cancelled) {
          await registration.update();
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("IQueue service worker registration failed", error);
        }
      }
    }

    void registerServiceWorker();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!SHOULD_ENABLE_PWA || typeof window === "undefined") return;

    function handleBeforeInstallPrompt(event: Event) {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();

      if (isStandaloneMode() || wasDismissedRecently()) return;

      setDeferredPrompt(installEvent);
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

  async function handleInstallClick() {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    setIsInstalling(false);
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
  }

  function handleDismiss() {
    try {
      window.localStorage.setItem(
        PWA_INSTALL_DISMISS_KEY,
        String(Date.now())
      );
    } catch {
      // Ignore storage failures for the install banner state.
    }
    setIsInstallVisible(false);
  }

  if (!shouldShowInstallPrompt) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 px-4 md:bottom-6">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto mx-auto flex w-full max-w-xl items-start gap-3 rounded-2xl border border-brand-blue/20 bg-slate-950 px-4 py-4 text-white shadow-2xl shadow-slate-900/25 dark:border-brand-blue/30"
      >
        <div className="mt-0.5 rounded-xl bg-brand-blue/15 p-2 text-brand-blue">
          <Smartphone className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Install IQueue</p>
          <p className="mt-1 text-sm leading-5 text-slate-200">
            Add the app to your home screen for faster access and offline QR
            boarding passes.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleInstallClick()}
              disabled={isInstalling}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-blue/25 transition hover:bg-blue-600 disabled:cursor-wait disabled:opacity-70"
            >
              <Download className="h-4 w-4" aria-hidden />
              {isInstalling ? "Opening prompt..." : "Install app"}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Maybe later
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss install message"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
