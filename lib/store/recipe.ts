import "server-only";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventoryItems,
  menuCategories,
  menuItems,
  recipeComponents,
  type InventoryUnit,
  type RecipeComponent,
} from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";

export type RecipeIngredient = {
  id: string;
  name: string;
  unit: InventoryUnit;
};

// Active stock items offered as recipe ingredients, alphabetical.
export async function listRecipeIngredients(): Promise<RecipeIngredient[]> {
  return db
    .select({ id: inventoryItems.id, name: inventoryItems.name, unit: inventoryItems.unit })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.storeId, STORE_ID), isNull(inventoryItems.deletedAt)))
    .orderBy(asc(inventoryItems.name));
}

// Every recipe component for this store's active menu items, grouped by menu
// item. Includes base (variantId null) and variant-specific rows.
export async function recipesByMenuItem(): Promise<
  Record<string, RecipeComponent[]>
> {
  // Scope to this store via its active menu items so a stray row can't leak.
  const itemIds = await db
    .select({ id: menuItems.id })
    .from(menuItems)
    .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .where(and(eq(menuCategories.storeId, STORE_ID), isNull(menuItems.deletedAt)));
  if (itemIds.length === 0) return {};

  const rows = await db
    .select()
    .from(recipeComponents)
    .where(inArray(recipeComponents.menuItemId, itemIds.map((r) => r.id)));

  const byItem: Record<string, RecipeComponent[]> = {};
  for (const r of rows) {
    (byItem[r.menuItemId] ??= []).push(r);
  }
  return byItem;
}
