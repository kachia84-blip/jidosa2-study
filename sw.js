// 앱 껍데기는 캐시 우선, data/는 네트워크 우선(답안 수정이 바로 반영되게)
const CACHE = "jd2-v1";
const SHELL = [
  "./", "index.html", "app.js", "router.js", "manifest.webmanifest", "icon.svg",
  "core/data.js", "core/store.js", "core/srs.js", "core/mask.js", "core/confidence.js",
  "ui/today.js", "ui/card.js", "ui/browse.js", "ui/stats.js", "ui/style.css",
  "data/questions.json", "data/answers.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || Response.error();
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(url.pathname.includes("/data/") ? networkFirst(e.request) : cacheFirst(e.request));
});
