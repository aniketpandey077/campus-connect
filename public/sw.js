// public/sw.js
// Basic service worker for Progressive Web App.
// Enables caching for essential static assets and offline mode.

const CACHE_NAME = "unihood-cache-v4";
const ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Network-first fallback to cache)
self.addEventListener("fetch", (e) => {
  // Only handle HTTP/HTTPS requests (skip chrome-extension, etc.)
  if (!e.request.url.startsWith("http")) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache valid responses
        if (res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return res;
      })
      .catch(() => {
        // Fallback to cache if network is down
        return caches.match(e.request);
      })
  );
});
