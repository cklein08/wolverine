const CACHE = 'wolverine-mobile-v1';
const ASSETS = [
  '/mobile-app/',
  '/mobile-app/index.html',
  '/mobile-app/app.css',
  '/mobile-app/app.js',
  '/mobile-app/manifest.webmanifest',
  '/mobile-app/icons/icon-192.png',
  '/mobile-app/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/mobile-app/')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
      if (res.ok && event.request.method === 'GET') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
      }
      return res;
    })),
  );
});
