import "server-only";
import { headers } from "next/headers";
import { DOMAIN_SLUG } from "@/lib/store/menu-path";
import { and, asc, eq, isNull } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  menuCategories,
  menuItems,
  menuItemVariants,
  menuCombos,
  menuComboItems,
  type MenuCategory,
  type MenuItem,
  type MenuItemVariant,
  type OrderSettings,
  type Store,
} from "@/lib/db/schema";
import { store } from "@/lib/db/schema";
import { featureOn } from "@/lib/store/features";
import { cached, menuTag } from "@/lib/store/cache";
import { getStoreById } from "@/lib/store/data";
import { getOrderSettingsById } from "@/lib/store/order-settings";
import { currentStoreId } from "@/lib/auth/dal";


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
async function buildMenu(storeId: string): Promise<MenuCategoryWithItems[]> {
  // Items and variants carry no store_id of their own — scope them through
  // their category so another café's rows never land in this tree.
  const mine = and(eq(menuCategories.storeId, storeId), isNull(menuCategories.deletedAt));
  const [cats, items, variants] = await Promise.all([
    db
      .select()
      .from(menuCategories)
      .where(mine)
      .orderBy(asc(menuCategories.position), asc(menuCategories.id)),
    db
      .select({ item: menuItems })
      .from(menuItems)
      .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(and(mine, isNull(menuItems.deletedAt)))
      .orderBy(asc(menuItems.position), asc(menuItems.id))
      .then((rows) => rows.map((r) => r.item)),
    db
      .select({ variant: menuItemVariants })
      .from(menuItemVariants)
      .innerJoin(menuItems, eq(menuItemVariants.itemId, menuItems.id))
      .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(mine)
      .orderBy(asc(menuItemVariants.position), asc(menuItemVariants.id))
      .then((rows) => rows.map((r) => r.variant)),
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

// Cached across requests (tag menu:<id>) — every POS load and every guest on
// the public menu reads it. Menu mutations call bust(menuTag(id)).
export const getFullMenuById = cache((storeId: string) =>
  cached(`menu-tree:${storeId}`, menuTag(storeId), () => buildMenu(storeId))(),
);
export const getFullMenu = cache(async () => getFullMenuById(await currentStoreId()));

export type ComboPart = {
  menuItemId: string;
  variantId: string | null;
  quantity: number;
  name: string;
  variantName: string | null;
  unitPrice: number;
};
export type ComboView = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  available: boolean;
  items: ComboPart[];
  /** What the parts cost bought one by one, at today's menu prices. */
  worth: number;
  /** Every part is still on the menu and on sale. */
  sellable: boolean;
};


// Combos resolved against the menu tree, so names, prices and availability are
// always today's. A part whose item/variant is gone or off makes it unsellable.
async function buildCombos(storeId: string): Promise<ComboView[]> {
  const [combos, parts, menu] = await Promise.all([
    db
      .select()
      .from(menuCombos)
      .where(and(eq(menuCombos.storeId, storeId), isNull(menuCombos.deletedAt)))
      .orderBy(asc(menuCombos.position), asc(menuCombos.createdAt)),
    db
      .select({ part: menuComboItems })
      .from(menuComboItems)
      .innerJoin(menuCombos, eq(menuComboItems.comboId, menuCombos.id))
      .where(and(eq(menuCombos.storeId, storeId), isNull(menuCombos.deletedAt)))
      .orderBy(asc(menuComboItems.position))
      .then((rows) => rows.map((r) => r.part)),
    getFullMenuById(storeId),
  ]);
  const items = new Map(
    menu.flatMap((c) => c.items.map((it) => [it.id, { it, on: c.available && it.available }] as const)),
  );
  return combos.map((c) => {
    let sellable = c.available;
    const resolved: ComboPart[] = [];
    for (const p of parts.filter((x) => x.comboId === c.id)) {
      const hit = items.get(p.menuItemId);
      const variant = p.variantId ? hit?.it.variants.find((v) => v.id === p.variantId) : null;
      if (!hit || (p.variantId && !variant)) {
        sellable = false;
        continue;
      }
      if (!hit.on) sellable = false;
      resolved.push({
        menuItemId: p.menuItemId,
        variantId: p.variantId,
        quantity: p.quantity,
        name: hit.it.name,
        variantName: variant?.name ?? null,
        unitPrice: Number(variant?.price ?? hit.it.price),
      });
    }
    const worth = Math.round(resolved.reduce((s, p) => s + p.unitPrice * p.quantity, 0) * 100) / 100;
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      price: c.price,
      available: c.available,
      items: resolved,
      worth,
      sellable: sellable && resolved.length > 0,
    };
  });
}

export const getCombosById = cache((storeId: string) =>
  cached(`menu-combos:${storeId}`, menuTag(storeId), () => buildCombos(storeId))(),
);
export const getCombos = cache(async () => getCombosById(await currentStoreId()));

export type PublicMenu = {
  store: Store;
  categories: MenuCategoryWithItems[];
  /** Combos on sale right now, pinned above the categories. */
  combos: ComboView[];
  /** Ordering config; ordering stays off until the store saves it once. */
  ordering: OrderSettings | null;
};

// Look up a published menu by its public slug. Returns null when missing,
// unpublished or switched off so the route can 404. Guest path: no session,
// so the store is found by slug (or by host for "~"). Slug and domain are
// unique columns, so the id lookup is one indexed read; the rest is cached.
export async function getPublicMenu(slug: string): Promise<PublicMenu | null> {
  let match = eq(store.menuSlug, slug);
  // "~" = the café's own domain (proxy.ts rewrite): the host picks the store.
  if (slug === DOMAIN_SLUG) {
    const h = await headers();
    const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(":")[0].toLowerCase();
    if (!host) return null;
    match = eq(store.menuDomain, host);
  }
  const [hit] = await db.select({ id: store.id }).from(store).where(match).limit(1);
  if (!hit) return null;
  const row = await getStoreById(hit.id);
  if (!row.menuSlug || !row.menuPublished || !featureOn(row.disabledFeatures, "publicMenu")) return null;
  const [menu, ordering, combos] = await Promise.all([
    getFullMenuById(row.id),
    getOrderSettingsById(row.id),
    getCombosById(row.id),
  ]);
  // Unavailable items hide from guests; categories left empty drop out.
  const categories = menu
    .map((c) => ({ ...c, items: c.items.filter((it) => it.available) }))
    .filter((c) => c.items.length > 0);
  return { store: row, categories, combos: combos.filter((c) => c.sellable), ordering };
}
