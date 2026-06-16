const CACHE_VERSION = "iqueue-pwa-v1";
const PRECACHE = `${CACHE_VERSION}-precache`;
const PAGES = `${CACHE_VERSION}-pages`;
const ASSETS = `${CACHE_VERSION}-assets`;
const IS_LOCAL_DEV_HOST = ["localhost", "127.0.0.1", "::1"].includes(
  self.location.hostname
);

const PRECACHE_URLS = [
  "/",
  "/home",
  "/tickets",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  if (IS_LOCAL_DEV_HOST) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(PRECACHE).then((cache) =>
      Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" }))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  if (IS_LOCAL_DEV_HOST) {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith("iqueue-pwa-"))
              .map((cacheName) => caches.delete(cacheName))
          )
        )
        .then(() => self.registration.unregister())
    );
    return;
  }

  const expectedCaches = new Set([PRECACHE, PAGES, ASSETS]);
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith("iqueue-pwa-") &&
                !expectedCaches.has(cacheName)
            )
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (IS_LOCAL_DEV_HOST) return;

  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

function isStaticAsset(request, url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    ["image", "font", "style", "script"].includes(request.destination)
  );
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(PAGES);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached =
      (await cache.match(request, { ignoreSearch: true })) ||
      (await caches.match(request, { ignoreSearch: true })) ||
      (await cache.match("/tickets")) ||
      (await caches.match("/tickets")) ||
      (await cache.match("/offline")) ||
      (await caches.match("/offline"));

    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) return cached;
  return networkPromise.then((response) => response || Response.error());
}
