// ═══════════════════════════════════════════════════════
// Argent Clair — Service Worker v2
// Stratégie : Cache First pour TOUT (app offline-first)
// ═══════════════════════════════════════════════════════

const CACHE_NAME = 'argent-clair-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  './sw.js'
];

// ── Installation : mise en cache immédiate et complète ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.all(
          ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.warn('Cache miss pour', url, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activation : supprimer les anciens caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch : Cache First pour tout ──
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignorer les requêtes vers d'autres origines (analytics, etc.)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          // Retourner depuis le cache immédiatement
          // Mettre à jour en arrière-plan si réseau disponible
          fetch(event.request)
            .then(response => {
              if (response && response.status === 200) {
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, response));
              }
            })
            .catch(() => {}); // Silencieux si pas de réseau
          return cached;
        }

        // Pas en cache — essayer le réseau
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200) return response;
            const clone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone));
            return response;
          })
          .catch(() => {
            // Hors ligne et pas en cache — retourner index.html comme fallback
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
