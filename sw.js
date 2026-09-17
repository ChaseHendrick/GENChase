/* GENChase — cache this studio file only. Never serve a stale copy. */
const CACHE = 'genchase-studio-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  const isStudio = url.pathname.endsWith('/studio.html') || url.pathname === '/studio.html' || url.pathname === '/';
  if (!isStudio) return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request)));
});
