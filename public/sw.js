const CACHE = 'anchor-v2';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon.svg'];

// 1. Install: Cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

// 2. Activate: Delete old caches (The missing piece)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});

// 3. Fetch: Network-first with cache fallback
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase')) return;
  
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      });
    }).catch(() => caches.match('/index.html'))
  );
});