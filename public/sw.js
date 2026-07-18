// Service worker for GymTrack Pro PWA.
// IMPORTANT: We do NOT intercept page navigations — those depend on the user's
// session and must always come fresh from the network (caching them caused
// "page couldn't load" errors). We only cache static assets (images, fonts).

const CACHE = "gymtrack-v4";

self.addEventListener("install", (event) => {
  // Precache the offline fallback page so it's available with no connection.
  // Best-effort: if it fails, install still proceeds.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add("/offline")).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin, API and auth: never touch. Let the browser handle them so
  // sessions and redirects always work.
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/")
  ) {
    return;
  }

  // Navigations (page loads): NETWORK-FIRST. We always fetch fresh from the
  // network so the page is session-correct and never stale. Only when the
  // network is unavailable do we serve the precached /offline page. We never
  // cache navigation responses, so the old "stale page couldn't load" bug can't
  // come back.
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline").then((r) => r || Response.error())
      )
    );
    return;
  }

  // Cache-first for static assets only (images, fonts, icons, static chunks).
  const isStaticAsset =
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/");

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});

// --- Push notifications ---
self.addEventListener("push", (event) => {
  let data = { title: "GymTrack Pro", body: "Time to train! 💪" };
  try { if (event.data) data = event.data.json(); } catch { /* use default */ }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: data.url || "/home",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) if (c.url.includes(url) && "focus" in c) return c.focus();
      return self.clients.openWindow(url);
    })
  );
});
