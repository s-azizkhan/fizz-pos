import { getStore } from "@/lib/store/data";

// Same-origin proxy for the store logo. The logo lives on an arbitrary host
// that need not send CORS headers, and <img crossOrigin> fails without them —
// which breaks the menu PNG export (a tainted canvas makes toPng throw).
// Streaming it from here makes it same-origin, so no CORS is involved at all.
//
// SSRF guard: the URL is never taken from the request. Only the logo the admin
// saved in store settings is ever fetched.
export async function GET() {
  const store = await getStore();
  const url = store.logoUrl;
  if (!url || !/^https?:\/\//.test(url)) {
    return new Response("No logo", { status: 404 });
  }

  const upstream = await fetch(url, { next: { revalidate: 3600 } }).catch(() => null);
  const type = upstream?.headers.get("content-type") ?? "";
  if (!upstream?.ok || !type.startsWith("image/")) {
    return new Response("Logo unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=3600",
    },
  });
}
