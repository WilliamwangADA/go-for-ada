/* 围棋小岛 Service Worker — 首访后秒开、离线可玩 */
const VERSION = 'go-ada-v051';
const CORE = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/engine.js', 'js/ai.js', 'js/blob.js', 'js/voice_lines.js', 'js/game.js', 'js/adventure.js',
  'assets/icons/icon-192.png', 'assets/icons/apple-touch-icon.png',
];
const AUDIO = [
  "audio/adv_area.mp3",
  "audio/adv_capture.mp3",
  "audio/adv_capture2.mp3",
  "audio/adv_choose.mp3",
  "audio/adv_connect.mp3",
  "audio/adv_double.mp3",
  "audio/adv_fail.mp3",
  "audio/adv_ladder.mp3",
  "audio/adv_save.mp3",
  "audio/adv_success1.mp3",
  "audio/adv_success2.mp3",
  "audio/ai_resign_cloud.mp3",
  "audio/ai_resign_moon.mp3",
  "audio/ai_resign_star.mp3",
  "audio/atari_warn.mp3",
  "audio/badge_1.mp3",
  "audio/badge_2.mp3",
  "audio/badge_3.mp3",
  "audio/badge_4.mp3",
  "audio/badge_5.mp3",
  "audio/cant_ko.mp3",
  "audio/cant_occupied.mp3",
  "audio/cant_suicide.mp3",
  "audio/capture_by_ai.mp3",
  "audio/capture_cheer.mp3",
  "audio/count.mp3",
  "audio/draw.mp3",
  "audio/hello.mp3",
  "audio/howto1.mp3",
  "audio/howto2.mp3",
  "audio/howto3.mp3",
  "audio/howto4.mp3",
  "audio/howto_face.mp3",
  "audio/lose.mp3",
  "audio/map_welcome.mp3",
  "audio/pass_ai.mp3",
  "audio/pass_you.mp3",
  "audio/pick_color.mp3",
  "audio/settle.mp3",
  "audio/start_cloud.mp3",
  "audio/start_moon.mp3",
  "audio/start_pvp.mp3",
  "audio/start_star.mp3",
  "audio/undo.mp3",
  "audio/win.mp3"
];

// install：只缓核心，快速接管
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

// activate：清旧版缓存 + 后台并发预缓存全部语音
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
    const c = await caches.open(VERSION);
    AUDIO.forEach(u => c.match(u).then(hit => { if (!hit) c.add(u).catch(() => {}); }));
  })());
});

// fetch：核心文件 stale-while-revalidate(先用缓存秒开、后台更新)；语音/图标纯缓存优先
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  const isMedia = url.pathname.includes('/audio/') || url.pathname.includes('/assets/');
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
