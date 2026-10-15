import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { DOMAIN_SLUG } from "@/lib/store/menu-path";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  menuCategories,
  menuItems,
  menuItemVariants,
  type MenuCategory,
  type MenuItem,
  type MenuItemVariant,
  type OrderSettings,
  type Store,
} from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import { featureOn } from "@/lib/store/features";
import { cached } from "@/lib/store/cache";
import { getStore } from "@/lib/store/data";
import { getOrderSettings } from "@/lib/store/order-settings";

export type MenuItemWithVariants = MenuItem & { variants: MenuItemVariant[] };
export type MenuCategoryWithItems = MenuCategory & {
  items: MenuItemWithVariants[];
};

// Items render in their manual (drag) `position` order everywhere — manager,
// POS, public menu, printable PDF. Variants still go cheapest first.
const byPrice = (a: { price: string }, b: { price: string }) =>
  Number(a.price) - Number(b.price);

// Assemble the full menu tree (active rows only), ordered by position. Used by
// the admin manager, POS, printable PDF and (filtered) the public renderer.
async function buildMenu(): Promise<MenuCategoryWithItems[]> {
  const [cats, items, variants] = await Promise.all([
    db
      .select()
      .from(menuCategories)
      .where(and(eq(menuCategories.storeId, STORE_ID), isNull(menuCategories.deletedAt)))
      .orderBy(asc(menuCategories.position), asc(menuCategories.id)),
    db
      .select()
      .from(menuItems)
      .where(isNull(menuItems.deletedAt))
      .orderBy(asc(menuItems.position), asc(menuItems.id)),
    db
      .select()
      .from(menuItemVariants)
      .orderBy(asc(menuItemVariants.position), asc(menuItemVariants.id)),
  ]);

  const variantsByItem = new Map<string, MenuItemVariant[]>();
  for (const v of variants) {
    const list = variantsByItem.get(v.itemId) ?? [];
    list.push(v);
    variantsByItem.set(v.itemId, list);
  }

  const itemsByCat = new Map<string, MenuItemWithVariants[]>();
  for (const it of items) {
    const list = itemsByCat.get(it.categoryId) ?? [];
    list.push({
      ...it,
      variants: [...(variantsByItem.get(it.id) ?? [])].sort(byPrice),
    });
    itemsByCat.set(it.categoryId, list);
  }

  return cats.map((c) => ({ ...c, items: itemsByCat.get(c.id) ?? [] }));
}

// Cached across requests (tag "menu") — every POS load and every guest on the
// public menu reads it. Menu mutations call bust("menu").
export const getFullMenu = cache(cached("menu-tree", "menu", buildMenu));

export type PublicMenu = {
  store: Store;
  categories: MenuCategoryWithItems[];
  /** Ordering config; ordering stays off until the store saves it once. */
  ordering: OrderSettings | null;
};

// Look up a published menu by its public slug. Returns null when missing,
// unpublished or switched off so the route can 404. Single store: the slug
// must match the one store row. Every read here is cached.
export async function getPublicMenu(slug: string): Promise<PublicMenu | null> {
  const row = await getStore();
  // "~" = the store's own domain (proxy.ts rewrite): the host must be the one saved.
  if (slug === DOMAIN_SLUG) {
    const h = await headers();
    const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(":")[0].toLowerCase();
    if (!row.menuDomain || host !== row.menuDomain) return null;
    slug = row.menuSlug ?? "";
  }
  if (row.menuSlug !== slug || !row.menuPublished || !featureOn(row.disabledFeatures, "publicMenu"))
    return null;
  const [menu, ordering] = await Promise.all([getFullMenu(), getOrderSettings()]);
  // Unavailable items hide from guests; categories left empty drop out.
  const categories = menu
    .map((c) => ({ ...c, items: c.items.filter((it) => it.available) }))
    .filter((c) => c.items.length > 0);
  return { store: row, categories, ordering };
}
