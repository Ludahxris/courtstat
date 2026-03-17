// CourtStat Service Worker
// Caches the app shell for full offline operation

const CACHE_NAME = 'courtstat-v1';
const ASSETS = [
  '/courtstat/index.html',
  '/courtstat/manifest.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600&family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap'
];

// Install — cache all core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets reliably; fonts best-effort
      return cache.addAll(['/courtstat/index.html', '/courtstat/manifest.json'])
        .then(() => cache.add('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600&family=Barlow+Condensed:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap').catch(() => {}));
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for app shell, network-first for Sheets API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Let Google Sheets API calls go straight to network — never cache
  if (url.hostname === 'sheets.googleapis.com') {
    event.respondWith(fetch(event.request).catch(() => new Response('offline', { status: 503 })));
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return cached index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/courtstat/index.html');
        }
      });
    })
  );
});
