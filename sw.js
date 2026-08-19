const CACHE_NAME = 'rcsvit-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/api.js',
  '/js/gallery.js',
  '/manifest.json'
];

// ── Install: pre-cache all static assets ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  // Activate immediately without waiting for old SW to die
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
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch: navigation gets index.html from cache (enables redirect feel) ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation requests (page loads): serve index.html from cache first.
  // This is what makes the browser "redirect" to the installed app —
  // Chrome intercepts in-scope navigations and opens the PWA window instead.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => cached || fetch(request))
    );
    return;
  }

  // All other requests: cache-first, fall back to network
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
