import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventoryItems,
  inventoryItemForm,
  stockMovements,
  stockMovementForm,
} from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import {
  listInventory,
  getInventoryItem,
  listMovements,
} from "@/lib/store/inventory";
import { router, protectedProcedure, editorProcedure } from "@/lib/trpc/init";

const fizzled = new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "Something fizzled. Try again.",
});

// A TRPCError thrown from inside a db.transaction must survive the outer
// catch — otherwise a business message ("Not enough stock…") is replaced by
// the generic one.
function rethrow(e: unknown): never {
  if (e instanceof TRPCError) throw e;
  throw fizzled;
}

function bump() {
  revalidatePath("/dashboard/inventory");
}

export const inventoryRouter = router({
  list: protectedProcedure.query(() => listInventory()),

  byId: protectedProcedure.input(z.uuid()).query(({ input }) => getInventoryItem(input)),

  // Was fetchMovements. The movement log for one item, read on demand by the
  // history modal. Any signed-in user who can see inventory may read it.
  movements: protectedProcedure
    .input(
      z.object({
        itemId: z.uuid("Invalid item."),
        limit: z.number().int().positive().max(500).default(200),
      }),
    )
    .query(async ({ input }) => {
      const item = await getInventoryItem(input.itemId);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown item." });
      try {
        return await listMovements(input.itemId, input.limit);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not load the log." });
      }
    }),

  // ---- Items ------------------------------------------------------------
  // editorProcedure replaces the old requireEditor() helper.
  createItem: editorProcedure
    .input(inventoryItemForm)
    .mutation(async ({ ctx, input }) => {
      try {
        await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(inventoryItems)
            .values({ ...input, storeId: STORE_ID, enteredBy: ctx.user.id })
            .returning({ id: inventoryItems.id });
          // Seed an opening-stock movement so history is complete from day one.
          if (Number(input.quantity) > 0) {
            await tx.insert(stockMovements).values({
              itemId: created.id,
              type: "receive",
              delta: input.quantity,
              resulting: input.quantity,
              note: "Opening stock",
              enteredBy: ctx.user.id,
            });
          }
        });
      } catch (e) {
        rethrow(e);
      }
      bump();
      return { ok: true as const };
    }),

  updateItem: editorProcedure
    .input(inventoryItemForm.extend({ id: z.uuid("Invalid item.") }))
    .mutation(async ({ input }) => {
      // Editing item details must not silently move stock — quantity changes
      // go through stock movements. Build the update set without quantity.
      const { name, sku, category, unit, reorderLevel, costPerUnit, supplier } = input;
      const details = { name, sku, category, unit, reorderLevel, costPerUnit, supplier };
      try {
        await db
          .update(inventoryItems)
          .set({ ...details, updatedAt: new Date() })
          .where(
            and(
              eq(inventoryItems.id, input.id),
              eq(inventoryItems.storeId, STORE_ID),
              isNull(inventoryItems.deletedAt),
            ),
          );
      } catch {
        throw fizzled;
      }
      bump();
      return { ok: true as const };
    }),

  deleteItem: editorProcedure
    .input(z.object({ id: z.uuid("Invalid item.") }))
    .mutation(async ({ input }) => {
      try {
        await db
          .update(inventoryItems)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(eq(inventoryItems.id, input.id), eq(inventoryItems.storeId, STORE_ID)),
          );
      } catch {
        throw fizzled;
      }
      bump();
      return { ok: true as const };
    }),

  // ---- Stock movements --------------------------------------------------
  recordMovement: editorProcedure
    .input(stockMovementForm)
    .mutation(async ({ ctx, input }) => {
      const { itemId, type, amount, note } = input;
      try {
        await db.transaction(async (tx) => {
          const [item] = await tx
            .select({ id: inventoryItems.id, quantity: inventoryItems.quantity })
            .from(inventoryItems)
            .where(
              and(
                eq(inventoryItems.id, itemId),
                eq(inventoryItems.storeId, STORE_ID),
                isNull(inventoryItems.deletedAt),
              ),
            )
            .limit(1);
          if (!item) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Unknown item." });
          }

          const current = Number(item.quantity);
          let delta: number;
          let resulting: number;

          if (type === "adjust") {
            // Recount: `amount` is the new absolute on-hand count.
            resulting = amount;
            delta = amount - current;
          } else {
            // receive adds; waste/sale remove.
            delta = type === "receive" ? amount : -amount;
            resulting = current + delta;
          }

          if (resulting < 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Not enough stock for that movement.",
            });
          }

          await tx.insert(stockMovements).values({
            itemId,
            type,
            delta: delta.toFixed(3),
            resulting: resulting.toFixed(3),
            note,
            enteredBy: ctx.user.id,
          });
          await tx
            .update(inventoryItems)
            .set({ quantity: resulting.toFixed(3), updatedAt: new Date() })
            .where(eq(inventoryItems.id, itemId));
        });
      } catch (e) {
        rethrow(e);
      }
      bump();
      return { ok: true as const };
    }),
});
