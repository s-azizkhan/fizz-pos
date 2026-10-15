import "server-only";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { trpc } from "@/lib/trpc/server";
import type { PublicMenu } from "@/lib/store/menu";
import { formatMoney } from "@/lib/store/format";
import { DOMAIN_SLUG, menuPath } from "@/lib/store/menu-path";
import type { Store } from "@/lib/db/schema";

// Shared by /m/[slug], /m/[slug]/menu and /m/[slug]/games.
export type PublicSearch = Promise<{ viewOnly?: string; t?: string }>;

// Table QR codes carry ?t=5. Kept short so it fits a badge.
export function tableParam(t: string | undefined): string | null {
  const v = (t ?? "").trim().slice(0, 12);
  return v || null;
}

// Absolute origin for canonical/OG URLs. NEXT_PUBLIC_SITE_URL wins (set it in
// prod so a proxy can't spoof the host); otherwise the request's own host.
export async function siteOrigin(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (env) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Where the menu canonically lives: the store's own domain when one is saved,
// else our /m/<slug>. Used for canonical, OG and JSON-LD URLs.
export async function publicUrl(store: Store, slug: string, sub: "" | "/menu" | "/games" = ""): Promise<string> {
  if (store.menuDomain) return `https://${store.menuDomain}${menuPath(DOMAIN_SLUG, sub)}`;
  return `${await siteOrigin()}${menuPath(slug, sub)}`;
}

// One-line pitch for <meta description> and OG: tagline, then what's on the
// menu, then where. Search snippets cut around 155 chars.
export function menuDescription(menu: PublicMenu): string {
  const { store, categories } = menu;
  const items = categories.reduce((n, c) => n + c.items.length, 0);
  const cats = categories.slice(0, 4).map((c) => c.name).join(", ");
  const where = [store.city, store.state].filter(Boolean).join(", ");
  const bits = [
    store.menuTagline,
    items ? `${items} items across ${cats}${categories.length > 4 ? " and more" : ""}` : null,
    where ? `${store.name} in ${where}` : null,
    menu.ordering?.ordering && menu.ordering.whatsapp ? "Order on WhatsApp" : null,
  ].filter(Boolean);
  return bits.join(". ").slice(0, 300) || `The menu at ${store.name}.`;
}

// Full metadata for a public page. `path` is the canonical path (no query:
// ?t= and ?viewOnly= variants all point at the same canonical). `noindex`
// keeps low-value pages (games) out of results without hiding the links.
export async function menuMetadata(
  slug: string,
  opts: { sub?: "" | "/menu" | "/games"; title?: string; noindex?: boolean } = {},
): Promise<Metadata> {
  const menu = await (await trpc()).menu.public(slug);
  if (!menu) return { title: "Menu not found", robots: { index: false } };
  const { store } = menu;
  const canonical = await publicUrl(store, slug, opts.sub ?? "");
  const origin = new URL(canonical).origin;
  const title = opts.title ?? `${store.name} — Menu${store.city ? ` · ${store.city}` : ""}`;
  const description = menuDescription(menu);
  const image = absolute(origin, store.menuWelcome?.coverUrl) ?? (store.logoUrl ? `${origin}/api/logo` : null);
  return {
    metadataBase: new URL(origin),
    title,
    description,
    applicationName: store.name,
    alternates: { canonical },
    robots: opts.noindex ? { index: false, follow: true } : { index: true, follow: true },
    keywords: [
      store.name,
      "menu",
      "food counter",
      "menu online",
      store.city ?? "",
      ...menu.categories.slice(0, 6).map((c) => c.name),
    ].filter(Boolean),
    openGraph: {
      type: "website",
      siteName: store.name,
      title,
      description,
      url: canonical,
      locale: "en_IN",
      ...(image ? { images: [{ url: image, alt: store.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

// schema.org Restaurant + Menu so Google can show the store card and menu
// items. Prices use the store's currency. Only what we actually know goes in.
export async function menuJsonLd(slug: string, menu: PublicMenu): Promise<Record<string, unknown>> {
  const { store, categories } = menu;
  const url = await publicUrl(store, slug);
  const origin = new URL(url).origin;
  const address =
    store.addressLine1 || store.city
      ? {
          "@type": "PostalAddress",
          streetAddress: [store.addressLine1, store.addressLine2].filter(Boolean).join(", ") || undefined,
          addressLocality: store.city ?? undefined,
          addressRegion: store.state ?? undefined,
          postalCode: store.postalCode ?? undefined,
          addressCountry: store.country ?? undefined,
        }
      : undefined;
  const socials = store.menuWelcome?.socials ?? [];
  const sameAs = [
    ...socials,
    store.instagram ? `https://instagram.com/${store.instagram.replace(/^@/, "")}` : null,
    store.website?.startsWith("http") ? store.website : null,
  ].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    "@id": url,
    name: store.name,
    url,
    description: menuDescription(menu),
    image: absolute(origin, store.menuWelcome?.coverUrl) ?? (store.logoUrl ? `${origin}/api/logo` : undefined),
    logo: store.logoUrl ? `${origin}/api/logo` : undefined,
    telephone: store.phone ?? undefined,
    email: store.email ?? undefined,
    address,
    sameAs: sameAs.length ? sameAs : undefined,
    priceRange: priceRange(menu),
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: store.openingTime,
      closes: store.closingTime,
    },
    hasMenu: {
      "@type": "Menu",
      "@id": `${url}/menu`,
      url: `${url}/menu`,
      name: `${store.name} Menu`,
      inLanguage: "en",
      hasMenuSection: categories.map((c) => ({
        "@type": "MenuSection",
        name: c.name,
        hasMenuItem: c.items.map((it) => ({
          "@type": "MenuItem",
          name: it.name,
          description: it.description || undefined,
          suitableForDiet:
            it.diet === "veg" ? "https://schema.org/VegetarianDiet" : undefined,
          offers:
            Number(it.price) > 0
              ? { "@type": "Offer", price: Number(it.price).toFixed(2), priceCurrency: store.currency }
              : it.variants.map((v) => ({
                  "@type": "Offer",
                  name: v.name,
                  price: Number(v.price).toFixed(2),
                  priceCurrency: store.currency,
                })),
        })),
      })),
    },
  };
}

// "₹80 – ₹450" from the cheapest and dearest priced thing on the menu.
function priceRange(menu: PublicMenu): string | undefined {
  const prices = menu.categories
    .flatMap((c) => c.items.flatMap((it) => [Number(it.price), ...it.variants.map((v) => Number(v.price))]))
    .filter((p) => p > 0);
  if (!prices.length) return undefined;
  const cur = menu.store.currency;
  return `${formatMoney(Math.min(...prices), cur)} – ${formatMoney(Math.max(...prices), cur)}`;
}

// Our own /api/img/… paths become absolute for crawlers; https stays as is.
function absolute(origin: string, u: string | undefined): string | null {
  if (!u) return null;
  return u.startsWith("/") ? `${origin}${u}` : u;
}
