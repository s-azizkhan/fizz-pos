// Public menu URLs. On the store's own domain (store.menuDomain) proxy.ts
// rewrites "/" → "/m/~", so links there drop the "/m/<slug>" prefix.
export const DOMAIN_SLUG = "~";

export function menuPath(slug: string, sub: "" | "/menu" | "/games" = ""): string {
  return slug === DOMAIN_SLUG ? sub || "/" : `/m/${slug}${sub}`;
}
