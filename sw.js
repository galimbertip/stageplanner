/* GPverse StagePlanner — service worker: funziona anche senza internet.
 * Prima la rete (gli aggiornamenti arrivano subito), senza rete la copia salvata. */
const CACHE = 'gpverse-stageplanner-V2.1.1'; // allineare sempre ad APP.version in js/core.js
const SHELL = ['./', './index.html', './js/core.js', './js/stage.js', './js/prove.js', './manifest.webmanifest',
  './assets/logo.jpg', './assets/icon.png', './assets/icon-192.png', './assets/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'sp-shared').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; const url = new URL(req.url);
  // copione condiviso da un'altra app (WhatsApp, mail, file): lo parcheggio e apro «Impara una parte»
  if (req.method === 'POST' && url.origin === location.origin && url.pathname.endsWith('/share')) {
    e.respondWith((async () => {
      try {
        const fd = await req.formData(); const f = fd.get('file');
        if (f && f.size) { const c = await caches.open('sp-shared'); await c.put('./__shared', new Response(f, { headers: { 'x-name': encodeURIComponent(f.name || 'copione'), 'content-type': f.type || 'application/octet-stream' } })); }
      } catch (err) {}
      return Response.redirect('./index.html?shared=1', 303);
    })());
    return;
  }
  if (req.method !== 'GET') return;
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !font) return;
  e.respondWith(fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))));
});
