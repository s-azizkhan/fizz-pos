import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
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
// metadata), RFC1918, CGNAT, unspecified, IPv6 unique-local/link-local and the
// IPv4-mapped forms of all of those. Any signed-up owner can set a logo URL,
// so the hostname is RESOLVED and every address checked — a name that points
// inside is as bad as a literal. net.BlockList does the parsing (incl.
// ::ffff:a.b.c.d and ::ffff:hex), so no hand-rolled prefix matching.
// ponytail: still resolves once here and once in fetch (a rebinding window);
// pin the connection to the checked IP via a custom dispatcher if that matters.
const DENY = new BlockList();
for (const [net, bits] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.168.0.0", 16], ["224.0.0.0", 3]] as const) {
  DENY.addSubnet(net, bits, "ipv4");
}
for (const [net, bits] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["64:ff9b::", 96], ["2002::", 16], ["2001::", 32]] as const) {
  DENY.addSubnet(net, bits, "ipv6");
}
function privateAddress(ip: string): boolean {
  const fam = isIP(ip);
  if (!fam) return true;
  return DENY.check(ip, fam === 6 ? "ipv6" : "ipv4");
}
async function resolvesPrivate(host: string): Promise<boolean> {
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  // An IPv6 literal in a logo URL has no honest use; refuse rather than parse.
  if (host.startsWith("[")) return true;
  if (isIP(host)) return privateAddress(host);
  const addrs = await lookup(host, { all: true }).catch(() => []);
  return addrs.length === 0 || addrs.some((a) => privateAddress(a.address));
}

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
