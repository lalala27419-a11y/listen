/* 噪声听写 · Service Worker
   改动 index.html 后把 VERSION 加一，用户下次打开会自动更新。 */
const VERSION = 'v4';
const CACHE = 'listen-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // 单个文件缺失不应该让整次安装失败
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // 缓存优先：这个应用离线是常态（地铁里练），网络只是用来取更新
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        // 后台悄悄更新，不阻塞本次使用
        fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res));
        }).catch(() => {});
        return hit;
      }
      return fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});

// 页面主动要求立即启用新版本
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
