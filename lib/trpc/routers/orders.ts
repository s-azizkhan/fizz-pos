import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  checkoutSchema,
  saveOrderSchema,
  orderItems,
  orders,
  orderStatus,
} from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import { computeTotals, r2 } from "@/lib/store/totals";
import { listOrders, getOrder, openOrderCount } from "@/lib/store/orders";
import { nextOrderNumber, getStore } from "@/lib/store/data";
import { applyRecipeDeductions } from "@/lib/store/inventory-deduct";
import { router, protectedProcedure } from "@/lib/trpc/init";

// The money columns every write shares, derived from computeTotals.
function moneyColumns(t: ReturnType<typeof computeTotals>) {
  return {
    subtotal: t.subtotal.toFixed(2),
    discount: t.safeDiscount.toFixed(2),
    tax: t.taxAmount.toFixed(2),
    taxRate: t.taxRate.toFixed(3),
    serviceFee: t.service.toFixed(2),
    packagingFee: t.packaging.toFixed(2),
    deliveryFee: t.delivery.toFixed(2),
    total: t.total.toFixed(2),
  };
}

// Replace an order's line items in a transaction-friendly way: wipe existing,
// insert the new snapshot. Names/prices are frozen on the row.
async function writeItems(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  orderId: string,
  lines: ReturnType<typeof computeTotals>["lines"],
) {
  await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
  await tx.insert(orderItems).values(
    lines.map((l) => ({
      orderId,
      menuItemId: l.menuItemId ?? null,
      variantId: l.variantId ?? null,
      name: l.name,
      variantName: l.variantName ?? null,
      unitPrice: l.unitPrice.toFixed(2),
      quantity: l.quantity,
      lineTotal: l.lineTotal.toFixed(2),
    })),
  );
}

// Load an order for editing, asserting it's still open. Guards against settling
// or re-saving a tab someone else already closed.
async function requireOpen(orderId: string) {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, STORE_ID)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
  if (row.status !== "open")
    throw new TRPCError({
      code: "CONFLICT",
      message: "This order is already closed.",
    });
  return row;
}

function fizzled(message: string) {
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
}

function bumpPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/till");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/inventory");
}

export const ordersRouter = router({
  list: protectedProcedure
    .input(z.enum(orderStatus.enumValues).optional())
    .query(({ input }) => listOrders(input)),

  byId: protectedProcedure.input(z.uuid()).query(({ input }) => getOrder(input)),

  openCount: protectedProcedure.query(() => openOrderCount()),

  // Save a dine-in (or any) tab as an OPEN order — no payment yet. Creates a new
  // order or updates an existing open one (repopulated from the orders page).
  save: protectedProcedure
    .input(saveOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const { orderId, type, reference, discount, fees, items } = input;
      const store = await getStore();
      const totals = computeTotals(
        items,
        discount,
        { rate: Number(store.taxRate), inclusive: store.taxInclusive },
        fees,
        type,
      );

      if (orderId) {
        const existing = await requireOpen(orderId);
        try {
          await db.transaction(async (tx) => {
            await tx
              .update(orders)
              .set({
                type,
                reference,
                ...moneyColumns(totals),
                servedBy: ctx.user.id,
                updatedAt: new Date(),
              })
              .where(eq(orders.id, orderId));
            await writeItems(tx, orderId, totals.lines);
          });
        } catch {
          throw fizzled("Something fizzled saving the tab. Try again.");
        }
        bumpPaths();
        return { orderId, orderNumber: existing.number };
      }

      const number = await nextOrderNumber();
      try {
        const newId = await db.transaction(async (tx) => {
          const [o] = await tx
            .insert(orders)
            .values({
              storeId: STORE_ID,
              number,
              status: "open",
              type,
              reference,
              ...moneyColumns(totals),
              servedBy: ctx.user.id,
            })
            .returning({ id: orders.id });
          await writeItems(tx, o.id, totals.lines);
          return o.id;
        });
        bumpPaths();
        return { orderId: newId, orderNumber: number };
      } catch {
        throw fizzled("Something fizzled saving the tab. Try again.");
      }
    }),

  // Settle an order: take payment and close it. Works for a brand-new order or
  // an existing open tab (pass orderId).
  checkout: protectedProcedure
    .input(checkoutSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        orderId,
        type,
        reference,
        paymentMethod,
        discount,
        fees,
        tendered,
        items,
      } = input;
      const store = await getStore();
      const totals = computeTotals(
        items,
        discount,
        { rate: Number(store.taxRate), inclusive: store.taxInclusive },
        fees,
        type,
      );

      if (paymentMethod === "cash" && tendered != null && tendered < totals.total) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cash tendered is less than the total.",
        });
      }
      const changeDue =
        paymentMethod === "cash" && tendered != null
          ? r2(tendered - totals.total)
          : null;

      const number = orderId
        ? (await requireOpen(orderId)).number
        : await nextOrderNumber();

      try {
        await db.transaction(async (tx) => {
          const settle = {
            status: "paid" as const,
            type,
            reference,
            ...moneyColumns(totals),
            paymentMethod,
            tendered: tendered != null ? tendered.toFixed(2) : null,
            changeDue: changeDue != null ? changeDue.toFixed(2) : null,
            servedBy: ctx.user.id,
            updatedAt: new Date(),
            paidAt: new Date(),
          };

          let id = orderId;
          if (id) {
            await tx.update(orders).set(settle).where(eq(orders.id, id));
          } else {
            const [o] = await tx
              .insert(orders)
              .values({ storeId: STORE_ID, number, ...settle })
              .returning({ id: orders.id });
            id = o.id;
          }
          await writeItems(tx, id, totals.lines);
          // Settling is the point of sale — burn the recipe stock now. Open tabs
          // (save) deliberately don't deduct, so this fires exactly once.
          await applyRecipeDeductions(tx, totals.lines, ctx.user.id);
        });
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw fizzled("Something fizzled at the till. Try again.");
      }

      bumpPaths();
      return {
        orderNumber: number,
        subtotal: totals.subtotal.toFixed(2),
        discount: totals.safeDiscount.toFixed(2),
        tax: totals.taxAmount.toFixed(2),
        taxLabel: store.taxLabel,
        fees: {
          service: totals.service.toFixed(2),
          packaging: totals.packaging.toFixed(2),
          delivery: totals.delivery.toFixed(2),
        },
        total: totals.total.toFixed(2),
        changeDue: changeDue != null ? changeDue.toFixed(2) : null,
      };
    }),

  // Cancel an open tab without taking payment.
  void: protectedProcedure
    .input(z.uuid())
    .mutation(async ({ input: orderId }) => {
      await requireOpen(orderId);
      try {
        await db
          .update(orders)
          .set({ status: "void", updatedAt: new Date() })
          .where(eq(orders.id, orderId));
      } catch {
        throw fizzled("Could not void the order.");
      }
      bumpPaths();
      return { ok: true as const };
    }),
});

