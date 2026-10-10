/* ぐるぐる音読 Service Worker：オフラインで開けるようにする。ページは「ネット優先・だめなら保存分」、ほかは「保存分優先」 */
const CACHE = 'guruguru-2740a35dfd';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !isFont) return;
  if (req.mode === 'navigate') {
    const base = new URL('./', self.registration.scope).pathname;
    const isApp = url.pathname === base || url.pathname === base + 'index.html';   // アプリ本体のときだけ保存する（404 や PDF は保存しない）
    e.respondWith(fetch(req).then(r => {
      if (isApp && r.ok && (r.headers.get('content-type') || '').includes('text/html')) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); }
      return r;
    })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return r;
  })));
});
