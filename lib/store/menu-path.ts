// Public menu URLs. On the store's own domain (store.menuDomain) proxy.ts
// rewrites "/" → "/m/~", so links there drop the "/m/<slug>" prefix.
export const DOMAIN_SLUG = "~";

// Slugs that can't be a subdomain: they're ours (or look like it).
export const RESERVED_SLUGS = ["www", "app", "api", "admin", "dashboard", "m", "mail", "static", "docs"];

// Shareable link for a menu: <slug>.<our domain> on a real domain (the proxy
// rewrites it to /m/<slug>), else /m/<slug> (localhost, IPs, *.vercel.app).
export function menuUrl(origin: string, slug: string): string {
  const { protocol, host } = new URL(origin);
  const bare = host.replace(/^www\./, "");
  const real = bare.includes(".") && !bare.endsWith(".vercel.app") && !/^[\d.:]+$/.test(bare);
  return real ? `${protocol}//${slug}.${bare}` : `${origin}/m/${slug}`;
}

export function menuPath(slug: string, sub: "" | "/menu" | "/games" = ""): string {
  return slug === DOMAIN_SLUG ? sub || "/" : `/m/${slug}${sub}`;
}
