// sw.js
const CACHE = 'anchor-v3'; // bump this whenever you change this file

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
];

// 1. Install: precache the app shell and activate immediately
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// 2. Activate: delete old caches and take control of open tabs
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

// Only cache good, same-origin responses
function isCacheable(res) {
  return res && res.ok && res.type === 'basic';
}

// 3. Fetch
self.addEventListener('fetch', (e) => {
  const { request } = e;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore anything that isn't our own origin (Supabase, fonts, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Page loads (including refreshes on /app/income etc.):
  // network-first so deploys show up, falling back to the cached shell offline.
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (isCacheable(res)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('/index.html', copy));
          }
          return res;
        })
        .catch(async () => (await caches.match('/index.html')) || caches.match('/'))
    );
    return;
  }

  // Everything else (JS, CSS, images): serve from cache instantly,
  // refresh the cache in the background.
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (isCacheable(res)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);

      if (cached) {
        e.waitUntil(network);
        return cached;
      }
      return network;
    })
  );
});