import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  checkoutSchema,
  kitchenMoveSchema,
  kitchenStatus,
  saveOrderSchema,
  webOrderSchema,
  type WebOrderInput,
  orderItems,
  orders,
} from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import { computeTotals, r2 } from "@/lib/store/totals";
import {
  listOrders,
  getOrder,
  openOrderCount,
  pendingWebOrders,
  listKot,
  kotCounts,
} from "@/lib/store/orders";
import { nextOrderNumber, getStore } from "@/lib/store/data";
import { receiptStore } from "@/lib/store/order-settings";
import { applyRecipeDeductions } from "@/lib/store/inventory-deduct";
import { resolveCustomer } from "@/lib/store/customers";
import { getPublicMenu } from "@/lib/store/menu";
import { router, protectedProcedure, adminProcedure, publicProcedure } from "@/lib/trpc/init";

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
// or re-saving a tab someone else already closed. Admins may edit any state.
async function requireOpen(orderId: string, role: string) {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, STORE_ID)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
  if (row.status !== "open" && role !== "admin")
    throw new TRPCError({
      code: "CONFLICT",
      message: "This order is already closed.",
    });
  return row;
}

// The order a previous delivery of this offline sale already created, if any.
async function byClientId(clientId: string | undefined) {
  if (!clientId) return undefined;
  const [row] = await db
    .select({ id: orders.id, number: orders.number, paidAt: orders.paidAt, total: orders.total })
    .from(orders)
    .where(and(eq(orders.storeId, STORE_ID), eq(orders.clientId, clientId)))
    .limit(1);
  return row;
}

// Backdating window for a replayed offline sale. Anything outside it (a bad
// device clock, a tampered payload) books at server time instead.
const MAX_OFFLINE_MS = 7 * 24 * 60 * 60 * 1000;
function saleTime(soldAt: Date | undefined) {
  const now = Date.now();
  return soldAt && soldAt.getTime() <= now && now - soldAt.getTime() < MAX_OFFLINE_MS
    ? soldAt
    : new Date(now);
}

function fizzled(message: string) {
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
}

function bumpPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pos");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/kot");
}

const WEB_TYPE = { "Dine-in": "dine_in", Takeaway: "takeaway", Delivery: "delivery" } as const;

// Price a guest's cart from the live public menu. Anything unavailable, gone,
// or not on the menu rejects the whole order rather than guessing.
function priceWebCart(
  menu: NonNullable<Awaited<ReturnType<typeof getPublicMenu>>>,
  items: WebOrderInput["items"],
) {
  const byId = new Map(menu.categories.flatMap((c) => c.items).map((it) => [it.id, it]));
  return items.map((l) => {
    const item = byId.get(l.menuItemId);
    const variant = l.variantId ? item?.variants.find((v) => v.id === l.variantId) : null;
    // Items with sizes are only orderable by size, same as the menu renders.
    if (!item || (l.variantId ? !variant : item.variants.length > 0)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Something in your order just came off the menu. Refresh and try again.",
      });
    }
    return {
      menuItemId: item.id,
      variantId: variant?.id ?? null,
      name: item.name,
      variantName: variant?.name ?? null,
      unitPrice: Number(variant?.price ?? item.price),
      quantity: l.quantity,
    };
  });
}

// Closed orders per page on the Orders screen; open tabs always come whole.
const ORDERS_PAGE = 60;

export const ordersRouter = router({
  // A guest's order from the public menu (/m/[slug]). PUBLIC — no session.
  // Lands as an open tab flagged webPending: on the Orders page, off the KOT
  // board until staff open it in the POS. Prices come from the live menu,
  // never the client; the customer is linked by phone.
  // ponytail: no rate limit — the item/qty caps bound one order, and staff
  // review every web order before the kitchen sees it. Add per-IP throttling
  // (Upstash / a table) if prank orders ever become a nuisance.
  placeWeb: publicProcedure.input(webOrderSchema).mutation(async ({ input }) => {
    const menu = await getPublicMenu(input.slug);
    const cfg = menu?.ordering;
    const modeOn = cfg && { "Dine-in": cfg.dineIn, Takeaway: cfg.takeaway, Delivery: cfg.delivery }[input.mode];
    if (!menu || !cfg?.ordering || !cfg.whatsapp || !modeOn) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Online ordering is off right now." });
    }
    const type = WEB_TYPE[input.mode];
    if (type === "delivery" && input.address.length < 8) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Add a delivery address." });
    }

    const lines = priceWebCart(menu, input.items);
    const units = lines.reduce((n, l) => n + l.quantity, 0);
    // Same fee rules the guest saw: packaging per unit off-premise, delivery flat.
    const totals = computeTotals(
      lines,
      0,
      { rate: Number(menu.store.taxRate), inclusive: menu.store.taxInclusive },
      {
        service: 0,
        packaging: type === "dine_in" ? 0 : Number(cfg.packagingFee) * units,
        delivery: Number(cfg.deliveryFee),
      },
      type,
    );
    const receipt = (orderNumber: string) => ({
      orderNumber,
      lines: totals.lines.map((l) => ({
        name: l.variantName ? `${l.name} (${l.variantName})` : l.name,
        quantity: l.quantity,
        lineTotal: l.lineTotal.toFixed(2),
      })),
      subtotal: totals.subtotal.toFixed(2),
      tax: totals.taxAmount.toFixed(2),
      taxLabel: menu.store.taxLabel,
      taxInclusive: menu.store.taxInclusive,
      packaging: totals.packaging.toFixed(2),
      delivery: totals.delivery.toFixed(2),
      total: totals.total.toFixed(2),
    });

    const dup = await byClientId(input.clientId);
    if (dup) return receipt(dup.number);

    // Delivery needs the address on the ticket; otherwise the note usually
    // carries the table number. The full note also travels in the WhatsApp.
    const reference =
      [type === "delivery" ? input.address : "", input.note].filter(Boolean).join(" · ").slice(0, 300) ||
      null;
    const number = await nextOrderNumber();
    try {
      await db.transaction(async (tx) => {
        const [o] = await tx
          .insert(orders)
          .values({
            storeId: STORE_ID,
            number,
            clientId: input.clientId,
            status: "open",
            webPending: true,
            source: "web",
            type,
            reference,
            customerId: await resolveCustomer(tx, {
              customerName: input.name,
              customerPhone: input.phone,
            }),
            ...moneyColumns(totals),
          })
          .returning({ id: orders.id });
        await writeItems(tx, o.id, totals.lines);
      });
    } catch {
      // A double tap lost the race on the clientId unique index — same order.
      const won = await byClientId(input.clientId);
      if (won) return receipt(won.number);
      throw fizzled("Something fizzled placing your order. Try again.");
    }
    bumpPaths();
    return receipt(number);
  }),

  list: protectedProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(200).default(ORDERS_PAGE),
      }),
    )
    .query(({ ctx, input }) =>
      listOrders(input.month, { ...input, includeVoid: ctx.user.role === "admin" }),
    ),

  byId: protectedProcedure.input(z.uuid()).query(({ input }) => getOrder(input)),

  openCount: protectedProcedure.query(() => openOrderCount()),
  webPending: protectedProcedure.query(() => pendingWebOrders()),

  // --- Kitchen board -------------------------------------------------------
  // Polled on an interval by the KOT screen, so keep both of these cheap.
  kot: protectedProcedure
    .input(z.enum(kitchenStatus.enumValues))
    .query(({ input }) => listKot(input)),

  kotCounts: protectedProcedure.query(() => kotCounts()),

  // The kitchen only pushes an order forward: new -> accepted -> ready. Going
  // backwards, or touching a voided order, is rejected — two cooks tapping the
  // same ticket must not un-do each other on a screen that repaints every few
  // seconds.
  kotMove: protectedProcedure
    .input(kitchenMoveSchema)
    .mutation(async ({ input }) => {
      const [row] = await db
        .select({ status: orders.status, lane: orders.kitchenStatus })
        .from(orders)
        .where(and(eq(orders.id, input.orderId), eq(orders.storeId, STORE_ID)))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      if (row.status === "void")
        throw new TRPCError({ code: "CONFLICT", message: "That order was voided." });

      const RANK = { new: 0, accepted: 1, ready: 2 } as const;
      if (RANK[input.to] <= RANK[row.lane]) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Already ${row.lane === "new" ? "in the queue" : row.lane}.`,
        });
      }

      await db
        .update(orders)
        .set({ kitchenStatus: input.to, updatedAt: new Date() })
        .where(eq(orders.id, input.orderId));
      revalidatePath("/dashboard/kot");
      return { ok: true as const };
    }),

  // Save a dine-in (or any) tab as an OPEN order — no payment yet. Creates a new
  // order or updates an existing open one (repopulated from the orders page).
  save: protectedProcedure
    .input(saveOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const { orderId, type, reference, discount, fees, items, clientId, soldAt } =
        input;
      const store = await getStore();
      const totals = computeTotals(
        items,
        discount,
        { rate: Number(store.taxRate), inclusive: store.taxInclusive },
        fees,
        type,
      );

      if (orderId) {
        const existing = await requireOpen(orderId, ctx.user.role);
        try {
          await db.transaction(async (tx) => {
            await tx
              .update(orders)
              .set({
                type,
                reference,
                webPending: false,
                source: input.source,
                customerId: await resolveCustomer(tx, input),
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

      // Replay of a tab already saved from the offline queue.
      const dup = await byClientId(clientId);
      if (dup) return { orderId: dup.id, orderNumber: dup.number };

      const number = await nextOrderNumber();
      try {
        const newId = await db.transaction(async (tx) => {
          const [o] = await tx
            .insert(orders)
            .values({
              storeId: STORE_ID,
              number,
              clientId,
              createdAt: saleTime(soldAt),
              status: "open",
              type,
              source: input.source,
              reference,
              customerId: await resolveCustomer(tx, input),
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
        // Lost a race with another delivery of the same queued tab.
        const won = await byClientId(clientId);
        if (won) return { orderId: won.id, orderNumber: won.number };
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
        clientId,
        soldAt,
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

      const at = saleTime(soldAt);

      // Replay of a sale that already landed: answer with the same receipt and
      // touch nothing — no new number, no second stock deduction.
      const dup = await byClientId(clientId);
      const existing = !dup && orderId ? await requireOpen(orderId, ctx.user.role) : null;
      // Admin re-settling an already-paid order: keep its sale time and don't
      // burn stock a second time.
      const resettle = existing?.status === "paid";
      let number = dup
        ? dup.number
        : existing
          ? existing.number
          : await nextOrderNumber();

      if (!dup) try {
        await db.transaction(async (tx) => {
          const settle = {
            status: "paid" as const,
            type,
            reference,
            webPending: false,
                source: input.source,
            customerId: await resolveCustomer(tx, input),
            ...moneyColumns(totals),
            paymentMethod,
            tendered: tendered != null ? tendered.toFixed(2) : null,
            changeDue: changeDue != null ? changeDue.toFixed(2) : null,
            servedBy: ctx.user.id,
            updatedAt: new Date(),
            paidAt: (resettle && existing?.paidAt) || at,
          };

          let id = orderId;
          if (id) {
            await tx.update(orders).set(settle).where(eq(orders.id, id));
          } else {
            const [o] = await tx
              .insert(orders)
              .values({ storeId: STORE_ID, number, clientId, createdAt: at, ...settle })
              .returning({ id: orders.id });
            id = o.id;
          }
          await writeItems(tx, id, totals.lines);
          // Settling is the point of sale — burn the recipe stock now. Open tabs
          // (save) deliberately don't deduct, so this fires exactly once.
          // ponytail: admin edits of a paid order don't reconcile stock; add a
          // diff-based deduction if inventory accuracy on edits matters.
          if (!resettle) await applyRecipeDeductions(tx, totals.lines, ctx.user.id);
        });
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        // Two deliveries of the same offline sale raced; the other one won the
        // unique index. Same sale, so answer as a replay.
        const won = await byClientId(clientId);
        if (!won) throw fizzled("Something fizzled at the POS. Try again.");
        number = won.number;
      }

      bumpPaths();
      // Everything a printed receipt needs (lib/print/templates ReceiptData),
      // so the POS can print without a second round trip.
      return {
        orderNumber: number,
        store: await receiptStore(),
        currency: store.currency,
        createdAt: dup?.paidAt ?? ((resettle && existing?.paidAt) || at),
        type,
        reference,
        paymentMethod,
        lines: totals.lines.map((l) => ({
          name: l.name,
          variantName: l.variantName ?? null,
          quantity: l.quantity,
          lineTotal: l.lineTotal.toFixed(2),
        })),
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

  // Cancel an open tab without taking payment. Admins can void any order.
  void: protectedProcedure
    .input(z.uuid())
    .mutation(async ({ ctx, input: orderId }) => {
      await requireOpen(orderId, ctx.user.role);
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

  // Hard delete, any state. Line items cascade.
  delete: adminProcedure
    .input(z.uuid())
    .mutation(async ({ input: orderId }) => {
      const gone = await db
        .delete(orders)
        .where(and(eq(orders.id, orderId), eq(orders.storeId, STORE_ID)))
        .returning({ id: orders.id });
      if (!gone.length)
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      bumpPaths();
      return { ok: true as const };
    }),
});
