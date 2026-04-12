/* WGS Record of Discussion — Service Worker
 *
 * Precaches the full site shell so the guide works offline. The
 * registration in js/app.js is gated on location.protocol === 'https:'
 * or a localhost hostname, so installing this worker has no effect
 * when the site is opened via file:// (service workers are blocked
 * on file:// anyway, but the gate keeps the console clean).
 *
 * Strategy:
 *  - install: pre-cache the known shell, skipWaiting so new versions
 *    activate immediately.
 *  - activate: clients.claim, delete any old cache versions.
 *  - fetch: cache-first for same-origin static assets
 *    (HTML / CSS / JS / JSON / images / vendor), network-first with
 *    cache fallback for navigations.
 *
 * When adding a new top-level page or asset, bump CACHE_VERSION and
 * add the URL to PRECACHE_URLS. The bump alone is enough to evict
 * stale entries from previous deployments.
 */

const CACHE_VERSION = 'wgs-rod-v6';
const PRECACHE_URLS = [
  './',
  'index.html',
  'understanding-wgs.html',
  'pitfalls.html',
  'resources.html',
  'faq.html',
  'form.html',
  'dashboard.html',
  'css/design-system.css',
  'css/components.css',
  'css/pages.css',
  'js/app.js',
  'js/chrome.js',
  'js/faq.js',
  'js/form.js',
  'js/wizard.js',
  'js/signature-pads.js',
  'js/persistence.js',
  'js/pdf-render.js',
  'js/dashboard.js',
  'js/vendor/fuse.min.js',
  'js/vendor/jspdf.umd.min.js',
  'assets/data/faq-knowledge.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      // addAll rejects the whole install if any single URL 404s. That's
      // intentional — a broken precache list should fail loudly rather
      // than silently ship a partial offline experience.
      cache.addAll(PRECACHE_URLS)
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle GETs; let anything else (POST, etc.) pass through.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache cross-origin. As of v2 the site has no intentional
  // cross-origin fetches, but anything that appears in future (e.g.
  // external tracking the user explicitly opts into) should pass
  // straight through the worker.
  if (url.origin !== self.location.origin) return;

  // Navigation requests: try network first so users see fresh HTML
  // when online, fall back to cache for full-offline mode.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('index.html')))
    );
    return;
  }

  // Static assets: cache-first, then network, then write-through.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // Only cache successful same-origin responses.
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
