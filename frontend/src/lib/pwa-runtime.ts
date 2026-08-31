export const SHOULD_ENABLE_PWA =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_ENABLE_SW === "true";

export const PWA_INSTALL_DISMISS_KEY = "iqueue:pwa-install-dismissed:v1";
export const PWA_INSTALL_REQUEST_EVENT = "iqueue:request-pwa-install";

export function shouldEnablePwaClientRuntime(): boolean {
  if (typeof window === "undefined") {
    return SHOULD_ENABLE_PWA;
  }

  const isLocalDevHost = ["localhost", "127.0.0.1", "::1"].includes(
    window.location.hostname
  );

  return SHOULD_ENABLE_PWA && !isLocalDevHost;
}

export async function cleanupDevelopmentPwaState(): Promise<void> {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations.map((registration) => registration.unregister())
    );
  }

  if ("caches" in window) {
    const cacheKeys = await window.caches.keys();
    const pwaCacheKeys = cacheKeys.filter((key) => key.startsWith("iqueue-pwa-"));

    await Promise.allSettled(
      pwaCacheKeys.map((key) => window.caches.delete(key))
    );
  }

  try {
    window.localStorage.removeItem(PWA_INSTALL_DISMISS_KEY);
  } catch {
    // Ignore localStorage cleanup failures in development.
  }
}
