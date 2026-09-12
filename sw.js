/* 围棋小岛 Service Worker — 首访后秒开、离线可玩 */
const VERSION = 'go-island-v060';
const CORE = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/engine.js', 'js/ai.js', 'js/blob.js', 'js/sfx.js', 'js/fx.js', 'js/game.js', 'js/adventure.js',
  'assets/icons/icon-192.png', 'assets/icons/apple-touch-icon.png',
];

// install：只缓核心，快速接管
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

// activate：清旧版缓存
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

// fetch：核心文件 stale-while-revalidate(先用缓存秒开、后台更新)；图标等资源纯缓存优先
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  const isMedia = url.pathname.includes('/assets/');
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (isMedia) {
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }
    const refresh = fetch(e.request).then(res => {
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }).catch(() => hit);
    return hit || refresh;
  })());
});
