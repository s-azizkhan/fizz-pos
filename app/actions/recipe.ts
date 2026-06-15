"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  menuCategories,
  menuItems,
  recipeForm,
  recipeComponents,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { STORE_ID } from "@/lib/store/constants";

export type RecipeState = { ok: boolean; error?: string };

async function requireEditor(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (user.role !== "admin" && user.role !== "manager") {
    return { ok: false, error: "Only admins and managers can edit recipes." };
  }
  return { ok: true };
}

// Save a menu item's recipe for one scope (base, or a specific variant). The
// editor sends the full component list; we replace all rows for that scope so
// removals stick. Wrapped in a transaction for an atomic swap.
export async function saveRecipe(
  _prev: RecipeState,
  formData: FormData,
): Promise<RecipeState> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;

  const parsed = recipeForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { menuItemId, variantId, components } = parsed.data;

  // Reject duplicate ingredients in one scope — the unique constraint would
  // throw anyway, but a clean message is friendlier.
  const seen = new Set<string>();
  for (const c of components) {
    if (seen.has(c.inventoryItemId)) {
      return { ok: false, error: "Each ingredient can only be listed once." };
    }
    seen.add(c.inventoryItemId);
  }

  try {
    // Guard: the menu item must belong to this store.
    const [owner] = await db
      .select({ id: menuItems.id })
      .from(menuItems)
      .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(
        and(
          eq(menuItems.id, menuItemId),
          eq(menuCategories.storeId, STORE_ID),
          isNull(menuItems.deletedAt),
        ),
      )
      .limit(1);
    if (!owner) return { ok: false, error: "Unknown item." };

    await db.transaction(async (tx) => {
      // Delete only the rows for this scope (base vs a single variant).
      const scope = variantId
        ? and(
            eq(recipeComponents.menuItemId, menuItemId),
            eq(recipeComponents.variantId, variantId),
          )
        : and(
            eq(recipeComponents.menuItemId, menuItemId),
            isNull(recipeComponents.variantId),
          );
      await tx.delete(recipeComponents).where(scope);

      if (components.length) {
        await tx.insert(recipeComponents).values(
          components.map((c) => ({
            menuItemId,
            variantId,
            inventoryItemId: c.inventoryItemId,
            quantity: c.quantity,
          })),
        );
      }
    });

    revalidatePath("/dashboard/menu");
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled saving the recipe. Try again." };
  }
}
