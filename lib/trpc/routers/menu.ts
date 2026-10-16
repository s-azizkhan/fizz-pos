import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, max, min, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  store,
  orderSettings,
  menuAppearanceShape,
  orderSettingsShape,
  categoryForm,
  itemForm,
  menuCategories,
  menuItems,
  menuItemVariants,
  menuCombos,
  menuComboItems,
  comboForm,
  type ComboInput,
} from "@/lib/db/schema";
import { getCombos, getFullMenu, getPublicMenu } from "@/lib/store/menu";
import { getOrderSettings } from "@/lib/store/order-settings";
import { bust, menuTag, storeTag } from "@/lib/store/cache";
import { getStore } from "@/lib/store/data";
import { planByKey, planStatus } from "@/lib/store/plans";
import { addDomain, removeDomain, domainStatus, vercelEnabled } from "@/lib/vercel";
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

function bump(storeId: string) {
  bust(menuTag(storeId));
  revalidatePath("/dashboard/menu");
}

const idInput = (msg: string) => z.object({ id: z.uuid(msg) });

// Items carry no store_id; "this store's items" = items in this store's
// categories. Every by-id item write ANDs this in so a guessed uuid from
// another café is a no-op.
const ownItems = (storeId: string) =>
  inArray(
    menuItems.categoryId,
    db.select({ id: menuCategories.id }).from(menuCategories).where(eq(menuCategories.storeId, storeId)),
  );

// The category a form names must be this store's.
async function requireCategory(storeId: string, categoryId: string) {
  const [owner] = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.storeId, storeId), isNull(menuCategories.deletedAt)))
    .limit(1);
  if (!owner) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown category." });
}

// Every part of a combo must be one of this store's live items, and a variant
// must belong to its item.
async function requireComboParts(storeId: string, parts: ComboInput["items"]) {
  const ids = [...new Set(parts.map((p) => p.menuItemId))];
  const [items, variants] = await Promise.all([
    db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(and(inArray(menuItems.id, ids), ownItems(storeId), isNull(menuItems.deletedAt))),
    db
      .select({ id: menuItemVariants.id, itemId: menuItemVariants.itemId })
      .from(menuItemVariants)
      .where(inArray(menuItemVariants.itemId, ids)),
  ]);
  const own = new Set(items.map((i) => i.id));
  const ok = parts.every(
    (p) =>
      own.has(p.menuItemId) &&
      (!p.variantId || variants.some((v) => v.id === p.variantId && v.itemId === p.menuItemId)),
  );
  if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Something in this combo is no longer on the menu." });
}

const comboRows = (comboId: string, parts: ComboInput["items"]) =>
  parts.map((p, i) => ({ ...p, comboId, position: i + 1 }));

// One modal edits both the look (store row) and the ordering config
// (order_settings row), so the mutation takes both shapes in one object.
const menuSettingsForm = z
  .object({ ...menuAppearanceShape, ...orderSettingsShape })
  // Taking orders with no number to send them to is a dead button.
  .refine((v) => !v.ordering || !!v.whatsapp, {
    path: ["whatsapp"],
    error: "Add a WhatsApp number to accept orders",
  })
  // Delivery with no mode left on would leave the guest nothing to pick.
  .refine((v) => !v.ordering || v.dineIn || v.takeaway || v.delivery, {
    path: ["dineIn"],
    error: "Offer at least one way to get the order",
  });

export const menuRouter = router({
  full: protectedProcedure.query(() => getFullMenu()),

  combos: protectedProcedure.query(() => getCombos()),

  // Ordering config for the admin modal (own table, lazily created).
  orderSettings: protectedProcedure.query(() => getOrderSettings()),

  // The public /m/[slug] page — no session.
  public: publicProcedure.input(z.string().min(1)).query(({ input }) => getPublicMenu(input)),

  updateAppearance: protectedProcedure
    .input(menuSettingsForm)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can edit menu settings.",
        });
      }
      const {
        ordering,
        whatsapp,
        dineIn,
        takeaway,
        delivery,
        deliveryFee,
        packagingFee,
        ...appearance
      } = input;
      // Store domain changed: register the new one with Vercel before saving so
      // a failed call leaves the old domain in place.
      const current = await getStore();
      const prev = current.menuDomain;
      if (appearance.menuDomain && appearance.menuDomain !== prev && !planByKey(planStatus(current).plan).domain) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your own domain comes with the Counter plan. Upgrade in Billing." });
      }
      if (appearance.menuDomain !== prev) {
        try {
          if (appearance.menuDomain) await addDomain(appearance.menuDomain);
          if (prev) await removeDomain(prev);
        } catch (e) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Couldn't add that domain: ${(e as Error).message}` });
        }
      }
      try {
        await db.transaction(async (tx) => {
          await tx
            .update(store)
            .set({ ...appearance, updatedAt: new Date() })
            .where(eq(store.id, ctx.user.storeId));
          // Ordering config lives in its own table, one row per store.
          await tx
            .insert(orderSettings)
            .values({
              storeId: ctx.user.storeId,
              ordering,
              whatsapp,
              dineIn,
              takeaway,
              delivery,
              deliveryFee,
              packagingFee,
            })
            .onConflictDoUpdate({
              target: orderSettings.storeId,
              set: {
                ordering,
                whatsapp,
                dineIn,
                takeaway,
                delivery,
                deliveryFee,
                packagingFee,
                updatedAt: new Date(),
              },
            });
        });
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
      bust(storeTag(ctx.user.storeId));
      revalidatePath("/dashboard/menu");
      // Still the only way the PUBLIC menu page goes stale-free for visitors.
      if (input.menuSlug) revalidatePath(`/m/${input.menuSlug}`);
      return { ok: true as const };
    }),

  // DNS state of the store's own domain for the settings modal.
  domainStatus: protectedProcedure.query(async () => {
    const { menuDomain } = await getStore();
    if (!menuDomain) return null;
    return { domain: menuDomain, ...(await domainStatus(menuDomain)) };
  }),
  domainsManaged: protectedProcedure.query(() => vercelEnabled),

  // ---- Categories -------------------------------------------------------
  createCategory: editorProcedure
    .input(categoryForm)
    .mutation(async ({ ctx, input }) => {
      try {
        const [{ value: maxPos } = { value: null }] = await db
          .select({ value: max(menuCategories.position) })
          .from(menuCategories)
          .where(
            and(eq(menuCategories.storeId, ctx.user.storeId), isNull(menuCategories.deletedAt)),
          );
        await db.insert(menuCategories).values({
          ...input,
          storeId: ctx.user.storeId,
          position: (maxPos ?? 0) + 1,
          enteredBy: ctx.user.id,
        });
      } catch {
        throw fizzled;
      }
      bump(ctx.user.storeId);
      return { ok: true as const };
    }),

  updateCategory: editorProcedure
    .input(categoryForm.extend({ id: z.uuid("Invalid category.") }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...fieldsToSet } = input;
      try {
        await db
          .update(menuCategories)
          .set({ ...fieldsToSet, updatedAt: new Date() })
          .where(
            and(
              eq(menuCategories.id, id),
              eq(menuCategories.storeId, ctx.user.storeId),
              isNull(menuCategories.deletedAt),
            ),
          );
      } catch {
        throw fizzled;
      }
      bump(ctx.user.storeId);
      return { ok: true as const };
    }),

  deleteCategory: editorProcedure
    .input(idInput("Invalid category."))
    .mutation(async ({ ctx, input }) => {
      try {
        await db
          .update(menuCategories)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(eq(menuCategories.id, input.id), eq(menuCategories.storeId, ctx.user.storeId)),
          );
      } catch {
        throw fizzled;
      }
      bump(ctx.user.storeId);
      return { ok: true as const };
    }),

  // Persist a new item order within one category: ids in order. Rows outside
  // that category (or another store's) are ignored by the WHERE.
  reorderItems: editorProcedure
    .input(z.object({ categoryId: z.uuid(), ids: z.array(z.uuid("Invalid order.")) }))
    .mutation(async ({ ctx, input }) => {
      const [cat] = await db
        .select({ id: menuCategories.id })
        .from(menuCategories)
        .where(and(eq(menuCategories.id, input.categoryId), eq(menuCategories.storeId, ctx.user.storeId)));
      if (!cat) throw new TRPCError({ code: "NOT_FOUND", message: "Category not found." });
      try {
        await db.transaction(async (tx) => {
          for (let i = 0; i < input.ids.length; i++) {
            await tx
              .update(menuItems)
              .set({ position: i + 1, updatedAt: new Date() })
              .where(and(eq(menuItems.id, input.ids[i]), eq(menuItems.categoryId, input.categoryId)));
          }
        });
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not save order.",
        });
      }
      bump(ctx.user.storeId);
      return { ok: true as const };
    }),

  // Persist a new category order: an array of ids, in order.
  reorderCategories: editorProcedure
    .input(z.array(z.uuid("Invalid order.")))
    .mutation(async ({ ctx, input }) => {
      try {
        await db.transaction(async (tx) => {
          for (let i = 0; i < input.length; i++) {
            await tx
              .update(menuCategories)
              .set({ position: i + 1, updatedAt: new Date() })
              .where(
                and(eq(menuCategories.id, input[i]), eq(menuCategories.storeId, ctx.user.storeId)),
              );
          }
        });
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not save order.",
        });
      }
      bump(ctx.user.storeId);
      return { ok: true as const };
    }),

  // ---- Items + variants -------------------------------------------------
  createItem: editorProcedure.input(itemForm).mutation(async ({ ctx, input }) => {
    const { variants, ...item } = input;
    try {
      await requireCategory(ctx.user.storeId, item.categoryId);

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
    bump(ctx.user.storeId);
    return { ok: true as const };
  }),

  updateItem: editorProcedure
    .input(itemForm.extend({ id: z.uuid("Invalid item.") }))
    .mutation(async ({ ctx, input }) => {
      const { variants, id, ...item } = input;
      try {
        await requireCategory(ctx.user.storeId, item.categoryId);
        await db.transaction(async (tx) => {
          const [hit] = await tx
            .update(menuItems)
            .set({ ...item, updatedAt: new Date() })
            .where(and(eq(menuItems.id, id), ownItems(ctx.user.storeId), isNull(menuItems.deletedAt)))
            .returning({ id: menuItems.id });
          if (!hit) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown item." });
          // Replace variants wholesale — simplest correct sync for a small list.
          // Combos point at variant ids: move them to the same-named new row
          // before the old ones go, or the cascade would drop them from combos.
          const old = await tx
            .select({ id: menuItemVariants.id, name: menuItemVariants.name })
            .from(menuItemVariants)
            .where(eq(menuItemVariants.itemId, id));
          const fresh = variants.length
            ? await tx
                .insert(menuItemVariants)
                .values(variants.map((v, i) => ({ ...v, itemId: id, position: i + 1 })))
                .returning({ id: menuItemVariants.id, name: menuItemVariants.name })
            : [];
          for (const o of old) {
            const to = fresh.find((f) => f.name === o.name);
            if (to) await tx.update(menuComboItems).set({ variantId: to.id }).where(eq(menuComboItems.variantId, o.id));
          }
          if (old.length) {
            await tx.delete(menuItemVariants).where(inArray(menuItemVariants.id, old.map((o) => o.id)));
          }
        });
      } catch (e) {
        rethrow(e);
      }
      bump(ctx.user.storeId);
      return { ok: true as const };
    }),

  deleteItem: editorProcedure
    .input(idInput("Invalid item."))
    .mutation(async ({ ctx, input }) => {
      try {
        await db
          .update(menuItems)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(menuItems.id, input.id), ownItems(ctx.user.storeId)));
      } catch {
        throw fizzled;
      }
      bump(ctx.user.storeId);
      return { ok: true as const };
    }),

  // Tag veg / non-veg / none from the row, no full editor.
  setDiet: editorProcedure
    .input(z.object({ id: z.uuid("Invalid item."), diet: z.enum(["veg", "nonveg"]).nullable() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await db
          .update(menuItems)
          .set({ diet: input.diet, updatedAt: new Date() })
          .where(and(eq(menuItems.id, input.id), ownItems(ctx.user.storeId), isNull(menuItems.deletedAt)));
      } catch {
        throw fizzled;
      }
      bump(ctx.user.storeId);
      return { ok: true as const };
    }),

  // Toggle availability without opening the full editor.
  toggleAvailable: editorProcedure
    .input(idInput("Invalid item."))
    .mutation(async ({ ctx, input }) => {
      try {
        await db
          .update(menuItems)
          .set({ available: sql`NOT ${menuItems.available}`, updatedAt: new Date() })
          .where(and(eq(menuItems.id, input.id), ownItems(ctx.user.storeId), isNull(menuItems.deletedAt)));
      } catch {
        throw fizzled;
      }
      bump(ctx.user.storeId);
      return { ok: true as const };
    }),

  // ---- Combos -------------------------------------------------------------
  createCombo: editorProcedure.input(comboForm).mutation(async ({ ctx, input }) => {
    const { items, ...combo } = input;
    try {
      await requireComboParts(ctx.user.storeId, items);
      await db.transaction(async (tx) => {
        // New combos go first — the latest deal is the one you're pushing.
        const [{ value: minPos } = { value: null }] = await tx
          .select({ value: min(menuCombos.position) })
          .from(menuCombos)
          .where(and(eq(menuCombos.storeId, ctx.user.storeId), isNull(menuCombos.deletedAt)));
        const [created] = await tx
          .insert(menuCombos)
          .values({ ...combo, storeId: ctx.user.storeId, position: (minPos ?? 1) - 1 })
          .returning({ id: menuCombos.id });
        await tx.insert(menuComboItems).values(comboRows(created.id, items));
      });
    } catch (e) {
      rethrow(e);
    }
    bump(ctx.user.storeId);
    return { ok: true as const };
  }),

  updateCombo: editorProcedure
    .input(comboForm.extend({ id: z.uuid("Invalid combo.") }))
    .mutation(async ({ ctx, input }) => {
      const { items, id, ...combo } = input;
      try {
        await requireComboParts(ctx.user.storeId, items);
        await db.transaction(async (tx) => {
          const [hit] = await tx
            .update(menuCombos)
            .set({ ...combo, updatedAt: new Date() })
            .where(and(eq(menuCombos.id, id), eq(menuCombos.storeId, ctx.user.storeId), isNull(menuCombos.deletedAt)))
            .returning({ id: menuCombos.id });
          if (!hit) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown combo." });
          await tx.delete(menuComboItems).where(eq(menuComboItems.comboId, id));
          await tx.insert(menuComboItems).values(comboRows(id, items));
        });
      } catch (e) {
        rethrow(e);
      }
      bump(ctx.user.storeId);
      return { ok: true as const };
    }),

  toggleCombo: editorProcedure.input(idInput("Invalid combo.")).mutation(async ({ ctx, input }) => {
    try {
      await db
        .update(menuCombos)
        .set({ available: sql`NOT ${menuCombos.available}`, updatedAt: new Date() })
        .where(and(eq(menuCombos.id, input.id), eq(menuCombos.storeId, ctx.user.storeId), isNull(menuCombos.deletedAt)));
    } catch {
      throw fizzled;
    }
    bump(ctx.user.storeId);
    return { ok: true as const };
  }),

  deleteCombo: editorProcedure.input(idInput("Invalid combo.")).mutation(async ({ ctx, input }) => {
    try {
      await db
        .update(menuCombos)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(menuCombos.id, input.id), eq(menuCombos.storeId, ctx.user.storeId)));
    } catch {
      throw fizzled;
    }
    bump(ctx.user.storeId);
    return { ok: true as const };
  }),
});
