const CACHE_NAME = 'rcsvit-v4';
const BASE = '/RCSVITCloud';
const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/gallery.html',
  BASE + '/detail.html',
  BASE + '/css/styles.css',
  BASE + '/js/api.js',
  BASE + '/js/gallery.js',
  BASE + '/manifest.json'
];

// ── Install: pre-cache all static assets ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Pass through cross-origin requests (API, Cloudinary, etc.)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  // For navigation requests: try cache first, then network,
  // only fall back to index.html if both fail (true 404)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).catch(() =>
          // Only reached if network is down — serve index as last resort
          caches.match(BASE + '/index.html')
        );
      })
    );
    return;
  }

  // Static assets: cache-first, fall back to network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
