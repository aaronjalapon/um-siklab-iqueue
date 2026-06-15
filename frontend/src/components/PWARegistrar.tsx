"use client";

import { useEffect } from "react";

const SHOULD_REGISTER =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_ENABLE_SW === "true";

export default function PWARegistrar() {
  useEffect(() => {
    if (!SHOULD_REGISTER || !("serviceWorker" in navigator)) return;

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

  return null;
}
