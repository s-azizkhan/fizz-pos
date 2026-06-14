import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  menuCategories,
  menuItems,
  menuItemVariants,
  store,
  type MenuCategory,
  type MenuItem,
  type MenuItemVariant,
  type Store,
} from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";

export type MenuItemWithVariants = MenuItem & { variants: MenuItemVariant[] };
export type MenuCategoryWithItems = MenuCategory & {
  items: MenuItemWithVariants[];
};

// Assemble the full menu tree (active rows only), ordered by position. Used by
// both the admin manager and the public renderer. `onlyAvailable` hides
// unavailable items for the public view.
async function buildMenu(onlyAvailable: boolean): Promise<MenuCategoryWithItems[]> {
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
    if (onlyAvailable && !it.available) continue;
    const list = itemsByCat.get(it.categoryId) ?? [];
    list.push({ ...it, variants: variantsByItem.get(it.id) ?? [] });
    itemsByCat.set(it.categoryId, list);
  }

  return cats.map((c) => ({ ...c, items: itemsByCat.get(c.id) ?? [] }));
}

export async function getFullMenu(): Promise<MenuCategoryWithItems[]> {
  return buildMenu(false);
}

export type PublicMenu = {
  store: Store;
  categories: MenuCategoryWithItems[];
};

// Look up a published menu by its public slug. Returns null when missing or
// unpublished so the route can 404.
export async function getPublicMenu(slug: string): Promise<PublicMenu | null> {
  const [row] = await db
    .select()
    .from(store)
    .where(and(eq(store.menuSlug, slug), eq(store.menuPublished, true)))
    .limit(1);
  if (!row) return null;
  const categories = (await buildMenu(true)).filter((c) => c.items.length > 0);
  return { store: row, categories };
}
