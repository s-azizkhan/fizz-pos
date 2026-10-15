import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { getStore, getStoreById } from "@/lib/store/data";
import { featureOn } from "@/lib/store/features";

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

// Addresses that must never be reachable: loopback, link-local (cloud
// metadata), RFC1918, IPv6 unique-local and IPv4-mapped forms of the same.
// Any signed-up owner can set a logo URL, so the hostname is RESOLVED and
// every address checked — a name that points inside is as bad as a literal.
// ponytail: still resolves once here and once in fetch (a rebinding window);
// pin the connection to the checked IP via a custom dispatcher if that matters.
function privateAddress(ip: string): boolean {
  const v4 = ip.replace(/^::ffff:/i, "");
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return a === 127 || a === 10 || a === 0 || (a === 169 && b === 254) || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 100 && b >= 64 && b <= 127);
  }
  const v6 = ip.toLowerCase();
  return v6 === "::1" || v6 === "::" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6);
}
async function resolvesPrivate(host: string): Promise<boolean> {
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  const bare = host.replace(/^\[|\]$/g, "");
  if (isIP(bare)) return privateAddress(bare);
  const addrs = await lookup(bare, { all: true }).catch(() => []);
  return addrs.length === 0 || addrs.some((a) => privateAddress(a.address));
}

// ?s=<storeId> names the store (public menu pages); without it, the signed-in
// user's own store (dashboard, printable menu).
export async function GET(req: Request) {
  const sid = new URL(req.url).searchParams.get("s");
  const store = sid ? await getStoreById(sid).catch(() => null) : await getStore();
  // Guest requests reach only a store that chose to be public.
  if (!store || (sid && !(store.menuPublished && featureOn(store.disabledFeatures, "publicMenu")))) {
    return new Response("No logo", { status: 404 });
  }
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
  if (url.protocol !== "https:" || url.port !== "" || url.username || url.password || (await resolvesPrivate(url.hostname))) {
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
