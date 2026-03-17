// CourtStat Service Worker v2
// Caches the app shell for full offline operation

const CACHE_NAME = 'courtstat-v2';

// Hostnames that should always go straight to network — never intercept
const PASSTHROUGH_HOSTS = [
  'script.google.com',
  'sheets.googleapis.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// Install — cache core app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([
        '/courtstat/index.html',
        '/courtstat/manifest.json'
      ])
    )
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — let external/API calls pass through, cache-first for app shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Let the browser handle all external API calls natively — no interception
  if (PASSTHROUGH_HOSTS.some(h => url.hostname.includes(h))) {
    return;
  }

  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Cache-first for app shell
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Only cache valid same-origin responses
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for page navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/courtstat/index.html');
        }
        // Return a valid empty response for everything else
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});
