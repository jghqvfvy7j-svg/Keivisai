// Keivis Assistant — Service Worker
// Sube CACHE_VERSION para publicar una actualización (dispara el banner in-app).
const CACHE_VERSION = 'keivis-v1';
const APP_SHELL = ['/offline.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST de delivery => lo maneja la cola offline
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegaciones: red primero, con página offline de respaldo.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }

  // Estáticos: caché primero.
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons') ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
