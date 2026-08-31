import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull, max, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  store,
  menuAppearanceForm,
  categoryForm,
  itemForm,
  menuCategories,
  menuItems,
  menuItemVariants,
} from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import { getFullMenu, getPublicMenu } from "@/lib/store/menu";
import {
  router,
  protectedProcedure,
  publicProcedure,
  editorProcedure,
} from "@/lib/trpc/init";

const fizzled = new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "Something fizzled. Try again.",
});

// A TRPCError raised inside a db.transaction must survive the outer catch.
function rethrow(e: unknown): never {
  if (e instanceof TRPCError) throw e;
  throw fizzled;
}

function bump() {
  revalidatePath("/dashboard/menu");
}

const idInput = (msg: string) => z.object({ id: z.uuid(msg) });

export const menuRouter = router({
  full: protectedProcedure.query(() => getFullMenu()),

  // The public /m/[slug] page — no session.
  public: publicProcedure.input(z.string().min(1)).query(({ input }) => getPublicMenu(input)),

  updateAppearance: protectedProcedure
    .input(menuAppearanceForm)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can edit menu settings.",
        });
      }
      try {
        await db
          .update(store)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(store.id, STORE_ID));
      } catch (e) {
        // Unique violation on slug is the common case.
        const msg = String(e);
        throw new TRPCError({
          code: msg.includes("menu_slug") || msg.includes("unique")
            ? "CONFLICT"
            : "INTERNAL_SERVER_ERROR",
          message:
            msg.includes("menu_slug") || msg.includes("unique")
              ? "That menu link is taken. Try another."
              : "Something fizzled. Try again.",
        });
      }
      revalidatePath("/dashboard/menu");
      // Still the only way the PUBLIC menu page goes stale-free for visitors.
      if (input.menuSlug) revalidatePath(`/m/${input.menuSlug}`);
      return { ok: true as const };
    }),

  // ---- Categories -------------------------------------------------------
  createCategory: editorProcedure
    .input(categoryForm)
    .mutation(async ({ ctx, input }) => {
      try {
        const [{ value: maxPos } = { value: null }] = await db
          .select({ value: max(menuCategories.position) })
          .from(menuCategories)
          .where(
            and(eq(menuCategories.storeId, STORE_ID), isNull(menuCategories.deletedAt)),
          );
        await db.insert(menuCategories).values({
          ...input,
          storeId: STORE_ID,
          position: (maxPos ?? 0) + 1,
          enteredBy: ctx.user.id,
        });
      } catch {
        throw fizzled;
      }
      bump();
      return { ok: true as const };
    }),

  updateCategory: editorProcedure
    .input(categoryForm.extend({ id: z.uuid("Invalid category.") }))
    .mutation(async ({ input }) => {
      const { id, ...fieldsToSet } = input;
      try {
        await db
          .update(menuCategories)
          .set({ ...fieldsToSet, updatedAt: new Date() })
          .where(
            and(
              eq(menuCategories.id, id),
              eq(menuCategories.storeId, STORE_ID),
              isNull(menuCategories.deletedAt),
            ),
          );
      } catch {
        throw fizzled;
      }
      bump();
      return { ok: true as const };
    }),

  deleteCategory: editorProcedure
    .input(idInput("Invalid category."))
    .mutation(async ({ input }) => {
      try {
        await db
          .update(menuCategories)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(eq(menuCategories.id, input.id), eq(menuCategories.storeId, STORE_ID)),
          );
      } catch {
        throw fizzled;
      }
      bump();
      return { ok: true as const };
    }),

  // Persist a new category order: an array of ids, in order.
  reorderCategories: editorProcedure
    .input(z.array(z.uuid("Invalid order.")))
    .mutation(async ({ input }) => {
      try {
        await db.transaction(async (tx) => {
          for (let i = 0; i < input.length; i++) {
            await tx
              .update(menuCategories)
              .set({ position: i + 1, updatedAt: new Date() })
              .where(
                and(eq(menuCategories.id, input[i]), eq(menuCategories.storeId, STORE_ID)),
              );
          }
        });
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not save order.",
        });
      }
      bump();
      return { ok: true as const };
    }),

  // ---- Items + variants -------------------------------------------------
  createItem: editorProcedure.input(itemForm).mutation(async ({ input }) => {
    const { variants, ...item } = input;
    try {
      // Guard: the chosen category must belong to this store.
      const [owner] = await db
        .select({ id: menuCategories.id })
        .from(menuCategories)
        .where(
          and(
            eq(menuCategories.id, item.categoryId),
            eq(menuCategories.storeId, STORE_ID),
            isNull(menuCategories.deletedAt),
          ),
        )
        .limit(1);
      if (!owner) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown category." });
      }

      const [{ value: maxPos } = { value: null }] = await db
        .select({ value: max(menuItems.position) })
        .from(menuItems)
        .where(and(eq(menuItems.categoryId, item.categoryId), isNull(menuItems.deletedAt)));

      await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(menuItems)
          .values({ ...item, position: (maxPos ?? 0) + 1 })
          .returning({ id: menuItems.id });
        if (variants.length) {
          await tx
            .insert(menuItemVariants)
            .values(variants.map((v, i) => ({ ...v, itemId: created.id, position: i + 1 })));
        }
      });
    } catch (e) {
      rethrow(e);
    }
    bump();
    return { ok: true as const };
  }),

  updateItem: editorProcedure
    .input(itemForm.extend({ id: z.uuid("Invalid item.") }))
    .mutation(async ({ input }) => {
      const { variants, id, ...item } = input;
      try {
        await db.transaction(async (tx) => {
          await tx
            .update(menuItems)
            .set({ ...item, updatedAt: new Date() })
            .where(and(eq(menuItems.id, id), isNull(menuItems.deletedAt)));
          // Replace variants wholesale — simplest correct sync for a small list.
          await tx.delete(menuItemVariants).where(eq(menuItemVariants.itemId, id));
          if (variants.length) {
            await tx
              .insert(menuItemVariants)
              .values(variants.map((v, i) => ({ ...v, itemId: id, position: i + 1 })));
          }
        });
      } catch (e) {
        rethrow(e);
      }
      bump();
      return { ok: true as const };
    }),

  deleteItem: editorProcedure
    .input(idInput("Invalid item."))
    .mutation(async ({ input }) => {
      try {
        await db
          .update(menuItems)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(menuItems.id, input.id));
      } catch {
        throw fizzled;
      }
      bump();
      return { ok: true as const };
    }),

  // Toggle availability without opening the full editor.
  toggleAvailable: editorProcedure
    .input(idInput("Invalid item."))
    .mutation(async ({ input }) => {
      try {
        await db
          .update(menuItems)
          .set({ available: sql`NOT ${menuItems.available}`, updatedAt: new Date() })
          .where(and(eq(menuItems.id, input.id), isNull(menuItems.deletedAt)));
      } catch {
        throw fizzled;
      }
      bump();
      return { ok: true as const };
    }),
});
