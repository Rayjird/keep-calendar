// Keepカレンダー 受け口アプリ
// Keepの「送信」で届いた本文を一時保存して、トップページ（?share=1）に渡す。
const CACHE = 'kc-v1';
const SHARE = 'kc-share';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== SHARE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  if (e.request.method === 'POST' && url.pathname.endsWith('/share')) {
    e.respondWith((async () => {
      const f = await e.request.formData();
      const text = [f.get('title'), f.get('text'), f.get('url')].filter(Boolean).join('\n');
      const c = await caches.open(SHARE);
      await c.put(new URL('shared-text', self.registration.scope).href, new Response(text));
      return Response.redirect(new URL('./?share=1', self.registration.scope).href, 303);
    })());
    return;
  }

  // 通常のページはネット優先、つながらなければ保存分を使う
  if (e.request.method === 'GET') {
    e.respondWith(
      fetch(e.request)
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
  }
});
