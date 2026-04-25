const CACHE_PREFIX = "diary-pwa-";
const CACHE_NAME = `${CACHE_PREFIX}v1777143757`;
const SW_SCOPE = self.registration.scope;

const LOCKER_PREFIX = "iykyk/contents/site/";
const lockerFiles = new Map();

const LOCKER_MIME = {
  html: "text/html;charset=utf-8",
  htm: "text/html;charset=utf-8",
  css: "text/css;charset=utf-8",
  js: "application/javascript;charset=utf-8",
  json: "application/json;charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  woff2: "font/woff2",
  woff: "font/woff",
};

function lockerMimeType(name) {
  const ext = name.split(".").pop().toLowerCase();
  return LOCKER_MIME[ext] || "application/octet-stream";
}

const SHELL_PAGE_URLS = [
  "./",
  "./index.html",

  "./about/",
  "./about/index.html",
  "./art/",
  "./art/index.html",
  "./code/",
  "./code/index.html",
  "./games/",
  "./games/index.html",
  "./iykyk/",
  "./iykyk/index.html",
  "./message/",
  "./message/index.html",
  "./more/",
  "./more/index.html",
  "./notes/",
  "./notes/index.html",
  "./sorry/",
  "./sorry/index.html",
  "./tools/",
  "./tools/index.html",
  "./tools/qr/",
  "./tools/qr/index.html",
  "./verify/",
  "./verify/index.html",
  "./verify/result/",
  "./verify/result/index.html",

  "./license/",
  "./license/index.html",
  "./license/agpl-3.0/",
  "./license/agpl-3.0/index.html",
  "./license/apache-2.0/",
  "./license/apache-2.0/index.html",
  "./license/bsd-2-clause/",
  "./license/bsd-2-clause/index.html",
  "./license/isc/",
  "./license/isc/index.html",
  "./license/mit/",
  "./license/mit/index.html",
  "./license/unlicense/",
  "./license/unlicense/index.html",
  "./whisper/",
  "./whisper/index.html",
  "./ama!/",
  "./ama!/index.html",
].map((path) => new URL(path, SW_SCOPE).toString());

const SHELL_ASSET_URLS = [
  "./manifest.webmanifest",

  "./assets/style/site.css",
  "./assets/style/theme.js",
  "./assets/core/ui.js",
  "./assets/fonts/font.woff2",
  "./assets/icons/icon.svg",
  "./assets/core/client.js",
  "./assets/core/core.js",
  "./assets/core/core.wasm",
  "./assets/core/qrcode.js",
  "./assets/core/utils.js",
  "./assets/core/worker.js",
  "./assets/worker/pwa.js",

  "./home.js",
  "./iykyk/iykyk.js",
  "./iykyk/contents/index.siv",
  "./message/message.js",
  "./tools/tools.js",
  "./tools/qr/qr.js",
  "./verify/public.tkey",
  "./verify/result/result.js",
  "./verify/verify.js",
  "./whisper/public.mkey",
  "./whisper/whisper.js",
].map((path) => new URL(path, SW_SCOPE).toString());

const APP_SHELL = [...SHELL_PAGE_URLS, ...SHELL_ASSET_URLS];

async function putInCache(cacheKey, response) {
  if (!response || !response.ok) {
    return response;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(cacheKey, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    await putInCache(request, response);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(
        APP_SHELL.map((url) => cache.add(new Request(url, { cache: "reload" })))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "locker-store") {
    lockerFiles.clear();
    for (const entry of data.files) {
      lockerFiles.set(entry.name, new Uint8Array(entry.data));
    }
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: "locker-ready" });
    }
  } else if (data.type === "locker-clear") {
    lockerFiles.clear();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestURL = new URL(event.request.url);
  if (requestURL.origin !== self.location.origin) {
    return;
  }

  const scopePath = new URL(SW_SCOPE).pathname;
  const pathname = requestURL.pathname;
  const rel = pathname.startsWith(scopePath) ? pathname.slice(scopePath.length) : null;

  if (rel !== null && rel.startsWith(LOCKER_PREFIX)) {
    if (lockerFiles.size === 0) {
      event.respondWith(Response.redirect(new URL("./iykyk/", SW_SCOPE).toString()));
      return;
    }

    const fileName = rel.slice(LOCKER_PREFIX.length);
    const lookup = fileName === "" || fileName.endsWith("/") ? fileName + "index.html" : fileName;
    const fileData = lockerFiles.get(lookup);

    if (fileData) {
      event.respondWith(
        new Response(fileData, {
          status: 200,
          headers: { "Content-Type": lockerMimeType(lookup) },
        })
      );
      return;
    }

    event.respondWith(new Response("Not found", { status: 404 }));
    return;
  }

  event.respondWith(networkFirst(event.request));
});
