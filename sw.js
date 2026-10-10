// Minimal service worker — exists mainly to satisfy PWA installability requirements
// (Chrome requires a registered service worker with a fetch handler before it will
// offer a full "Install" option instead of just "Create shortcut").
//
// Strategy: network-first. This app shows live inventory/cost data, so we always
// prefer a fresh network response and only fall back to a cached copy if the
// device is genuinely offline — we don't want stale stock numbers served from cache
// while online.

const CACHE_NAME = 'admin-database-shell-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
