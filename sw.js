const CACHE_NAME = 'rcsvit-v3';
const BASE = '/RCSVITCloud';
const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
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

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation requests: always serve index.html from cache
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(BASE + '/index.html').then((cached) => cached || fetch(request))
    );
    return;
  }

  // Static assets: cache-first, fall back to network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
