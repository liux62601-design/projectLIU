/* ============================================================
   TechTutorial Pro — Service Worker
   Cache-first strategy with network fallback for offline support
   ============================================================ */

const CACHE_NAME = 'techtutorial-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/404.html',
  '/manifest.json',
  '/robots.txt',
  '/assets/css/main.css',
  '/assets/css/components.css',
  '/assets/css/animations.css',
  '/assets/css/responsive.css',
  '/assets/js/utils.js',
  '/assets/js/theme.js',
  '/assets/js/navigation.js',
  '/assets/js/animations.js',
  '/assets/js/gallery.js',
  '/assets/js/faq.js',
  '/assets/js/contact.js',
  '/assets/js/qrcode.js',
  '/assets/js/pwa.js',
  '/assets/js/main.js',
  '/assets/img/logo.svg',
  '/assets/img/hero-bg.svg',
  '/assets/img/placeholder.svg',
  '/tutorials/index.html',
  '/tutorials/data/index.json',
  '/downloads/index.html',
  '/downloads/data/downloads.json',
];

/* --- Install: Cache all static assets ---------------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Some assets failed to cache:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

/* --- Activate: Clean old caches ---------------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

/* --- Fetch: Cache-first, network fallback ------------ */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-http(s) requests
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // Skip external requests (Google Fonts, CDNs, analytics)
  if (url.origin !== self.location.origin) {
    // For Google Fonts, use cache-first
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      event.respondWith(
        caches.match(event.request).then((cached) => {
          return cached || fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          });
        })
      );
    }
    return;
  }

  // For HTML pages: network-first (always get latest)
  if (event.request.headers.get('Accept') && event.request.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/404.html');
          });
        })
    );
    return;
  }

  // For JSON data (tutorial content): network-first
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/404.html');
        }
        return new Response('Offline - Resource not available', { status: 503 });
      });
    })
  );
});

/* --- Message Handling -------------------------------- */
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
