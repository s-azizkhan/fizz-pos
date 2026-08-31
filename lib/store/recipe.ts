import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
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
  // One join, not a two-step id fetch: scope to this store through the menu
  // item -> category chain so a stray row can't leak.
  const rows = await db
    .select({ c: recipeComponents })
    .from(recipeComponents)
    .innerJoin(menuItems, eq(recipeComponents.menuItemId, menuItems.id))
    .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .where(and(eq(menuCategories.storeId, STORE_ID), isNull(menuItems.deletedAt)));

  const byItem: Record<string, RecipeComponent[]> = {};
  for (const { c } of rows) {
    (byItem[c.menuItemId] ??= []).push(c);
  }
  return byItem;
}
