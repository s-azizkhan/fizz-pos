import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { getStore, getStoreById } from "@/lib/store/data";

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

// ?s=<storeId> names the store (public menu pages); without it, the signed-in
// user's own store (dashboard, printable menu).
export async function GET(req: Request) {
  const sid = new URL(req.url).searchParams.get("s");
  const store = sid ? await getStoreById(sid).catch(() => null) : await getStore();
  if (!store) return new Response("No logo", { status: 404 });
  const raw = store.logoUrl;
  if (!raw) return new Response("No logo", { status: 404 });

  // Uploaded logo: ours, served from the DB. No fetch, no SSRF surface.
  const own = raw.match(/^\/api\/img\/([0-9a-f-]{36})$/);
  if (own) {
    const [img] = await db
      .select()
      .from(images)
      .where(and(eq(images.id, own[1]), eq(images.storeId, store.id)))
      .limit(1);
    if (!img) return new Response("No logo", { status: 404 });
    return new Response(new Uint8Array(img.data), {
      headers: { "content-type": img.mime, "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff" },
    });
  }

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
