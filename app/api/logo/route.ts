import { getStore } from "@/lib/store/data";

// Same-origin proxy for the store logo. The logo lives on an arbitrary host
// that need not send CORS headers, and <img crossOrigin> fails without them —
// which breaks the menu PNG export (a tainted canvas makes toPng throw).
// Streaming it from here makes it same-origin, so no CORS is involved at all.
//
// Serving foreign bytes from our own origin is the risk this route has to pay
// for, so both ends are locked down:
//
// - Request side: the URL is never read from the request. Only the logo an
//   admin saved in store settings is fetched, and only over https to a public
//   host — a private/loopback target would turn this into an SSRF hop.
// - Response side: a logo may legitimately be an SVG, which is a document, not
//   just pixels. `sandbox` + a null CSP stop any script inside it from running
//   in our origin if someone opens /api/logo directly; `nosniff` keeps the
//   browser from re-typing the bytes into something executable.

// Hosts that must never be reachable: loopback, link-local (cloud metadata),
// and the RFC1918 ranges. Literal-IP check only — resolving DNS to catch a
// hostname pointing inside is a bigger job than this route deserves.
// ponytail: swap in a resolve-then-check if logos ever come from untrusted users.
const PRIVATE_HOST =
  /^(localhost$|127\.|0\.0\.0\.0$|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

export async function GET() {
  const store = await getStore();
  const raw = store.logoUrl;
  if (!raw) return new Response("No logo", { status: 404 });

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new Response("No logo", { status: 404 });
  }
  if (url.protocol !== "https:" || PRIVATE_HOST.test(url.hostname)) {
    return new Response("No logo", { status: 404 });
  }

  const upstream = await fetch(url, {
    redirect: "error", // a redirect could land somewhere the checks above rejected
    next: { revalidate: 3600 },
  }).catch(() => null);
  const type = upstream?.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (!upstream?.ok || !type.startsWith("image/")) {
    return new Response("Logo unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=3600",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}
