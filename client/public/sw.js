// DJ-JK service worker (Phase 1 — PWA / offline-capable core)
// Strategy:
//  - App shell & hashed static assets: network-first, fall back to cache offline.
//  - Navigations: serve cached index.html (offline app shell) when offline.
//  - Everything else (cross-origin API/AI): never cached (can be flaky / authed).

const CACHE = "dj-jk-v1";
const PRECACHE = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Offline app shell for navigations.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() =>
          caches.match("/index.html").then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }

  if (isSameOrigin) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request)),
    );
  }
});
