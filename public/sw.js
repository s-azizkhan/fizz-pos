/**
 * Fizz service worker.
 *
 * Deliberately small and hand-written — the caching story here is three rules,
 * which is less code than configuring a plugin to do the same thing.
 *
 * 1. Build assets (/_next/static/*, icons, splash) are immutable → cache first.
 * 2. Page navigations → network first (4s head start), fall back to the last
 *    good copy of that page, then to a self-contained offline document.
 * 3. Everything else (/api/trpc, POSTs, auth, anything non-GET) is never
 *    touched. Money and stock must never be served from a stale cache.
 */

const VERSION = "fizz-v5";
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;

// Next serves pages with `Vary: rsc, next-router-state-tree, ...`. Cache.match
// honours Vary, so a plain lookup misses whenever the stored request's routing
// headers differ from the one being served. Ignore Vary; we key on URL by
// design.
const MATCH_OPTS = { ignoreVary: true };

const SHELL_ASSETS = ["/icon-192.png", "/icon-512.png"];

/**
 * The offline fallback is inlined here, with no scripts and no external assets,
 * and that is load-bearing rather than lazy.
 *
 * Serving a real Next page (e.g. /offline) as the fallback looks like it works
 * — the HTML arrives — but React then hydrates it under the *requested* URL,
 * finds no matching route data, and tries to recover over the network that just
 * failed. The recovery attempt is what produces the browser's own "page
 * couldn't load" screen. A static document has nothing to hydrate, so it stays.
 */
const OFFLINE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0E1116">
<title>Offline — Fizz</title>
<style>
  *{box-sizing:border-box}
  html,body{height:100%;margin:0}
  body{background:#0E1116;color:#F4F1E9;display:grid;place-items:center;
    padding:24px calc(24px + env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom)) calc(24px + env(safe-area-inset-left));
    font:400 16px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
    text-align:center;overflow:hidden}
  .wrap{position:relative;max-width:34ch;z-index:1}
  .mark{font-size:26px;font-weight:700;letter-spacing:-.02em}
  .mark i{color:#C6F432;font-style:normal}
  .mark sup{color:#38E1D6;font-size:11px}
  h1{font-size:clamp(26px,7vw,34px);line-height:1.1;letter-spacing:-.02em;margin:14px 0 10px;font-weight:700}
  p{color:#8A93A1;margin:0}
  .note{border:1px solid #2A313C;background:#1A1F28;border-radius:18px;
    padding:14px 16px;font-size:14px;color:#8A93A1;margin:24px 0 28px;text-align:left}
  .note b{color:#F4F1E9;font-weight:600}
  a{display:inline-block;background:#C6F432;color:#0E1116;text-decoration:none;
    font-weight:600;padding:13px 26px;border-radius:18px}
  .dot{display:inline-block;width:7px;height:7px;border-radius:99px;background:#E2655A;
    margin-right:8px;vertical-align:middle;animation:pulse 1.6s ease-in-out infinite}
  .status{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E2655A;
    font-weight:600;margin-top:26px}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
  /* Effervescent bubbles, the brand's signature motif — deterministic, CSS only. */
  .b{position:fixed;bottom:-40px;border-radius:99px;
    background:radial-gradient(circle at 30% 30%,rgba(198,244,50,.5),rgba(56,225,214,.15));
    animation:rise linear infinite;opacity:0}
  @keyframes rise{0%{transform:translateY(0) scale(.6);opacity:0}
    10%{opacity:.9}90%{opacity:.5}100%{transform:translateY(-105vh) scale(1.1);opacity:0}}
  @media (prefers-reduced-motion:reduce){.b,.dot{animation:none}}
</style></head>
<body>
  <span class="b" style="width:14px;height:14px;left:12vw;animation-duration:9s;animation-delay:-2s"></span>
  <span class="b" style="width:8px;height:8px;left:34vw;animation-duration:11s;animation-delay:-6s"></span>
  <span class="b" style="width:20px;height:20px;left:58vw;animation-duration:8s;animation-delay:-1s"></span>
  <span class="b" style="width:10px;height:10px;left:78vw;animation-duration:12s;animation-delay:-4s"></span>
  <span class="b" style="width:16px;height:16px;left:90vw;animation-duration:10s;animation-delay:-8s"></span>
  <div class="wrap">
    <div class="mark">Fi<i>zz</i><sup>&bull;</sup></div>
    <div class="status"><span class="dot"></span>No connection</div>
    <h1>The connection fizzled.</h1>
    <p>This page isn&rsquo;t saved on the device yet.</p>
    <div class="note">
      <b>Pages you&rsquo;ve already opened still work.</b><br>
      Anything that moves money or stock waits until you&rsquo;re back — nothing
      is lost, and nothing is saved twice.
    </div>
    <a href="/dashboard">Back to the floor</a>
  </div>
</body></html>`;

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Floor screens worth having offline. Sidebar clicks are client-side RSC
 * fetches, which this worker never caches — so without warming, a screen only
 * works offline if it was once opened with a full page load. Offline, Next
 * falls back to a hard navigation, which then finds these copies.
 * They show the board as of the last warm, not live data.
 */
const WARM = ["/dashboard", "/dashboard/pos", "/dashboard/kot", "/dashboard/orders"];
let lastWarm = 0;

async function warm() {
  // ponytail: in-memory throttle, resets when the worker restarts — at worst
  // one extra round of renders. Persist the stamp if that ever shows in logs.
  if (Date.now() - lastWarm < 60_000) return;
  lastWarm = Date.now();
  const cache = await caches.open(PAGES);
  await Promise.all(
    WARM.map(async (path) => {
      try {
        const res = await fetch(path, { headers: { Accept: "text/html" } });
        // Signed out → redirected to /login; never bank that (see networkFirst).
        if (res.ok && !res.redirected) await cache.put(path, res);
      } catch {
        // Offline or flaky — keep whatever copy we already have.
      }
    }),
  );
}

self.addEventListener("message", (event) => {
  // Lets the page trigger an immediate update instead of waiting for a reload.
  if (event.data === "skip-waiting") self.skipWaiting();
  if (event.data === "warm") event.waitUntil(warm());
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/splash/") ||
    /\.(png|svg|ico|webp|jpg|jpeg|woff2?)$/.test(url.pathname)
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request, MATCH_OPTS);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(SHELL);
    cache.put(request, response.clone());
  }
  return response;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Lie-fi guard. On a link that says "connected" but moves nothing, fetch()
 * neither resolves nor fails for minutes. Give the network a head start, then
 * answer from the last good copy and let the late response refresh the cache.
 * With no copy we keep waiting — the network is the only hope.
 */
const NAV_TIMEOUT_MS = 4000;

async function networkFirst(event) {
  const { request } = event;
  const network = fetch(request).then((response) => {
    // Only bank successful, non-redirected HTML. Caching a redirect to /login
    // would strand a signed-out session on the login page after signing in.
    if (response.ok && !response.redirected) {
      const copy = response.clone();
      caches.open(PAGES).then((cache) => cache.put(request, copy));
    }
    return response;
  });
  // Keep the worker alive so a late response still lands in the cache.
  event.waitUntil(network.then(() => {}, () => {}));
  // The last good copy of this exact page still hydrates correctly, because
  // the URL matches what React expects.
  const cached = caches.match(request, MATCH_OPTS);
  try {
    return await Promise.race([
      network,
      sleep(NAV_TIMEOUT_MS).then(async () => (await cached) ?? network),
    ]);
  } catch {
    return (await cached) ?? html(OFFLINE_HTML, 503);
  }
}

/**
 * In-app navigations fetch an RSC payload, which we never cache. When one
 * hangs and we hold an HTML copy of that page, fail it: Next then falls back
 * to a full browser navigation, which networkFirst answers from the cache.
 * Longer than NAV_TIMEOUT_MS because router.refresh() rides this path too —
 * a slow-but-working refresh shouldn't be swapped for a stale reload.
 * Prefetches are left alone; a failed one costs nothing.
 */
const RSC_TIMEOUT_MS = 8000;

async function rscWithEscape(request) {
  const network = fetch(request);
  const hung = await Promise.race([
    network.then(() => false, () => false),
    sleep(RSC_TIMEOUT_MS).then(() => true),
  ]);
  if (!hung) return network;
  const page = new URL(request.url);
  page.searchParams.delete("_rsc");
  const cached = await caches.match(page.toString(), MATCH_OPTS);
  return cached ? Response.error() : network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // RSC navigations: straight to the network, but with an escape hatch for
  // lie-fi (never served from cache — see rscWithEscape).
  if (
    request.method === "GET" &&
    url.origin === self.location.origin &&
    request.headers.get("rsc") === "1" &&
    !request.headers.has("next-router-prefetch")
  ) {
    event.respondWith(rscWithEscape(request));
    return;
  }

  // Never intercept mutations, cross-origin calls, or anything that carries a
  // tRPC call / RSC payload — those must always hit the network.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    request.headers.has("Next-Action") ||
    url.searchParams.has("_rsc")
  ) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(event));
  }
});
