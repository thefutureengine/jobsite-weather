const CACHE_NAME = 'jobsite-wx-v7';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/js/app.js',
  '/js/trial.js',
  '/js/weather.js',
  '/js/locations.js',
  '/js/notes.js',
  '/js/foreman.js',
  '/js/project.js',
  '/js/settings.js',
  '/js/notifications.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network-first for API calls and serverless functions
  if (url.hostname !== location.hostname || url.pathname.startsWith('/.netlify/') || url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // App shell: cache-first, then network
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
