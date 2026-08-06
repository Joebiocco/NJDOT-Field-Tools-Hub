/* ============================================================
   service-worker.js  —  Field Tools Hub offline cache

   Caching strategy:
   - HTML pages:   NETWORK-FIRST  (always try latest, fall back to cache when offline)
   - Static files: CACHE-FIRST    (icons, JSON, manifest — rarely change)
   - CDN libs:     NETWORK-FIRST  (Leaflet, html2canvas, jsPDF, fonts)

   Storage NOT touched by this worker (safe across updates):
   - localStorage: bookmarks, recent sessions, dark mode, install state
   - IndexedDB: work-order photos + per-session data (ft_photos DB)
   ============================================================ */

const CACHE = 'ft-v1.33-2026-06-01';

// Local assets to pre-cache on install
const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/field-ui.css',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-192-maskable.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/favicon-32.png',
  './assets/icons/favicon-16.png',
  './assets/icons/apple-touch-icon.png',
  './pages/njsearch.html',
  './pages/njfuel.html',
  './pages/WorkOrderCloseout.html',
  './data/njfuel.json',
  './data/bridges/index.json?v=2026-08-05-coordinate-review',
  './pages/timesheet.html',
  './pages/milemarker.html',
  './data/mileposts/index.json',
  './pages/dc144.html',
  './js/dc144.js',
  './data/dc144-template.xlsx',
  './pages/emergency.html',
  './js/milepost-lookup.js',
  './js/roadway-lookup.js',
  './data/roadways/index.json',
  './pages/weather.html',
  './assets/hero/bridge-dark.webp',
  './assets/hero/bridge-light.webp',
  './assets/hero/nj-dark.webp',
  './assets/hero/nj-light.webp',
  './assets/wo-pdf-logo.png',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(LOCAL_ASSETS).catch(function() {
        // If any asset fails, continue anyway
        return Promise.all(LOCAL_ASSETS.map(function(url) {
          return c.add(url).catch(function() {});
        }));
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// When hub's reload button is clicked it sends RELOAD_ALL here;
// we forward a RELOAD message to every open window client so all
// pages get a fresh fetch simultaneously.
self.addEventListener('message', function(e) {
  if (!e.data || e.data.type !== 'RELOAD_ALL') return;
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
    clients.forEach(function(client) {
      // Never auto-reload the Work Order page — it may have unsaved form data
      if (client.url && client.url.indexOf('WorkOrderCloseout') !== -1) return;
      client.postMessage({ type: 'RELOAD' });
    });
  });
});

// Weather notifications opened from the installed app or desktop browser
// should return to the weather tool when the user taps them.
self.addEventListener('notificationclick', function(e) {
  var target = (e.notification && e.notification.data && e.notification.data.url) || './pages/weather.html';
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      for (var i = 0; i < clients.length; i += 1) {
        var client = clients[i];
        if (client.url && client.url.indexOf('/pages/weather.html') !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })
  );
});

// A configured Web Push sender can wake this worker while the page is closed.
// The static app still needs a server to create subscriptions and send signed
// payloads; this handler is the receiving half of that flow.
self.addEventListener('push', function(e) {
  var payload = {};
  try {
    if (e.data) payload = e.data.json();
  } catch(_) {
    try { payload = { body: e.data && e.data.text ? e.data.text() : '' }; } catch(__) {}
  }
  payload = payload && typeof payload === 'object' ? payload : {};
  var nested = payload.data && typeof payload.data === 'object' ? payload.data : {};
  var notification = payload.notification && typeof payload.notification === 'object' ? payload.notification : {};
  var title = String(nested.title || notification.title || payload.title || 'Weather alert');
  var body = String(nested.body || notification.body || payload.body || 'A weather alert is ready to review.');
  var target = nested.url || notification.url || payload.url || './pages/weather.html';
  var tag = String(nested.tag || notification.tag || payload.tag || 'field-tools-weather-alert');
  var options = {
    body: body,
    icon: nested.icon || notification.icon || payload.icon || './assets/icons/icon-192.png',
    badge: nested.badge || notification.badge || payload.badge || './assets/icons/icon-192.png',
    tag: tag,
    renotify: true,
    data: {
      url: target,
      alertKey: nested.alertKey || notification.alertKey || payload.alertKey || ''
    }
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Heuristic: is this an HTML/document request?
function isHTML(request, url) {
  if (request.mode === 'navigate') return true;
  var accept = request.headers.get('accept') || '';
  if (accept.indexOf('text/html') !== -1) return true;
  // Filename-based fallback
  return /\.html?$/.test(url) || url.endsWith('/');
}

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  var isLocal = url.startsWith(self.location.origin);

  if (isLocal) {
    if (isHTML(e.request, url)) {
      // HTML pages: network-first so users always see the latest UI.
      // Cache fallback only when network fails (true offline).
      // Use cache:'no-cache' so the browser HTTP cache is always
      // validated — prevents stale pages after a SW update.
      var freshReq = new Request(e.request.url, {
        cache: 'no-cache',
        credentials: 'same-origin',
        redirect: 'follow'
      });
      e.respondWith(
        fetch(freshReq).then(function(resp) {
          if (resp && resp.ok) {
            var clone = resp.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          }
          return resp;
        }).catch(function() {
          return caches.match(e.request).then(function(cached) {
            return cached || caches.match('./index.html');
          });
        })
      );
    } else {
      // Non-HTML local assets (icons, JSON, manifest): cache-first.
      // These rarely change; bumping CACHE name above forces a refresh.
      e.respondWith(
        caches.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(resp) {
            if (resp && resp.ok) {
              var clone = resp.clone();
              caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
            }
            return resp;
          }).catch(function() { return cached; });
        })
      );
    }
    return;
  }

  // CDN resources (Leaflet, html2canvas, jsPDF, fonts): network-first,
  // fall back to cache so offline use still works after first load.
  var isCDN = url.includes('unpkg.com') || url.includes('cdnjs.cloudflare.com') ||
              url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com') ||
              url.includes('cdn.jsdelivr.net');
  if (isCDN) {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        if (resp && resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
  }
});
