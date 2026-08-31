import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  menuCategories,
  menuItems,
  recipeForm,
  recipeComponents,
} from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import { listRecipeIngredients, recipesByMenuItem } from "@/lib/store/recipe";
import { router, protectedProcedure, editorProcedure } from "@/lib/trpc/init";

export const recipeRouter = router({
  ingredients: protectedProcedure.query(() => listRecipeIngredients()),
  byMenuItem: protectedProcedure.query(() => recipesByMenuItem()),

  // Save a menu item's recipe for one scope (base, or a specific variant). The
  // editor sends the full component list; we replace all rows for that scope so
  // removals stick. Wrapped in a transaction for an atomic swap.
  save: editorProcedure.input(recipeForm).mutation(async ({ input }) => {
    const { menuItemId, variantId, components } = input;

    // Reject duplicate ingredients in one scope — the unique constraint would
    // throw anyway, but a clean message is friendlier.
    const seen = new Set<string>();
    for (const c of components) {
      if (seen.has(c.inventoryItemId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Each ingredient can only be listed once.",
        });
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
      if (!owner) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown item." });
      }

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
    } catch (e) {
      if (e instanceof TRPCError) throw e;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Something fizzled saving the recipe. Try again.",
      });
    }

    revalidatePath("/dashboard/menu");
    return { ok: true as const };
  }),
});
