const CACHE_NAME = 'jobsite-wx-v12';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/js/app-bundle.js'
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

  // Never intercept cross-origin requests
  if(url.hostname !== location.hostname) return;

  // Never intercept Netlify functions
  if(url.pathname.startsWith('/.netlify/')) return;

  // Stale-while-revalidate for everything else
  e.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(response => {
          if(response.ok) cache.put(e.request, response.clone());
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      });
    })
  );
});
