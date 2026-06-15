"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  checkoutSchema,
  saveOrderSchema,
  orderItems,
  orders,
  type CheckoutInput,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { STORE_ID } from "@/lib/store/constants";
import { nextOrderNumber, getStore } from "@/lib/store/data";
import { applyRecipeDeductions } from "@/lib/store/inventory-deduct";

export type CheckoutResult =
  | {
      ok: true;
      orderNumber: string;
      subtotal: string;
      discount: string;
      tax: string;
      taxLabel: string;
      total: string;
      changeDue: string | null;
    }
  | { ok: false; error: string };

export type SaveResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; error: string };

export type VoidResult = { ok: true } | { ok: false; error: string };

const r2 = (n: number) => Math.round(n * 100) / 100;

// Recompute totals server-side from the validated lines — never trust client
// math. Applies the store's tax: when inclusive, prices already contain tax so
// we back it out; otherwise tax is added on top of the discounted subtotal.
function computeTotals(
  items: CheckoutInput["items"],
  discount: number,
  tax: { rate: number; inclusive: boolean },
) {
  const lines = items.map((l) => ({
    ...l,
    lineTotal: r2(l.unitPrice * l.quantity),
  }));
  const subtotal = r2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const safeDiscount = Math.min(discount, subtotal);
  const net = r2(subtotal - safeDiscount); // taxable base
  const rate = tax.rate / 100;

  let taxAmount = 0;
  let total = net;
  if (rate > 0) {
    if (tax.inclusive) {
      // Prices include tax — extract the tax portion; total is unchanged.
      taxAmount = r2(net - net / (1 + rate));
      total = net;
    } else {
      taxAmount = r2(net * rate);
      total = r2(net + taxAmount);
    }
  }
  return { lines, subtotal, safeDiscount, taxAmount, taxRate: tax.rate, total };
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
  if (!row) return { ok: false as const, error: "Order not found." };
  if (row.status !== "open")
    return { ok: false as const, error: "This order is already closed." };
  return { ok: true as const, order: row };
}

// Save a dine-in (or any) tab as an OPEN order — no payment yet. Creates a new
// order or updates an existing open one (repopulated from the orders page).
export async function saveOrder(payload: unknown): Promise<SaveResult> {
  const user = await getCurrentUser();
  const parsed = saveOrderSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order" };
  }
  const { orderId, type, reference, discount, items } = parsed.data;
  const store = await getStore();
  const { lines, subtotal, safeDiscount, taxAmount, taxRate, total } = computeTotals(
    items,
    discount,
    { rate: Number(store.taxRate), inclusive: store.taxInclusive },
  );

  try {
    if (orderId) {
      const guard = await requireOpen(orderId);
      if (!guard.ok) return { ok: false, error: guard.error };
      const number = guard.order.number;
      await db.transaction(async (tx) => {
        await tx
          .update(orders)
          .set({
            type,
            reference,
            subtotal: subtotal.toFixed(2),
            discount: safeDiscount.toFixed(2),
            tax: taxAmount.toFixed(2),
            taxRate: taxRate.toFixed(3),
            total: total.toFixed(2),
            servedBy: user.id,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));
        await writeItems(tx, orderId, lines);
      });
      bumpPaths();
      return { ok: true, orderId, orderNumber: number };
    }

    const number = await nextOrderNumber();
    const newId = await db.transaction(async (tx) => {
      const [o] = await tx
        .insert(orders)
        .values({
          storeId: STORE_ID,
          number,
          status: "open",
          type,
          reference,
          subtotal: subtotal.toFixed(2),
          discount: safeDiscount.toFixed(2),
          tax: taxAmount.toFixed(2),
          taxRate: taxRate.toFixed(3),
          total: total.toFixed(2),
          servedBy: user.id,
        })
        .returning({ id: orders.id });
      await writeItems(tx, o.id, lines);
      return o.id;
    });
    bumpPaths();
    return { ok: true, orderId: newId, orderNumber: number };
  } catch {
    return { ok: false, error: "Something fizzled saving the tab. Try again." };
  }
}

// Settle an order: take payment and close it. Works for a brand-new order or an
// existing open tab (pass orderId). Snapshots line names/prices for the receipt.
export async function checkout(payload: unknown): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order" };
  }
  const { orderId, type, reference, paymentMethod, discount, tendered, items } =
    parsed.data;
  const store = await getStore();
  const { lines, subtotal, safeDiscount, taxAmount, taxRate, total } = computeTotals(
    items,
    discount,
    { rate: Number(store.taxRate), inclusive: store.taxInclusive },
  );

  if (paymentMethod === "cash" && tendered != null && tendered < total) {
    return { ok: false, error: "Cash tendered is less than the total." };
  }
  const changeDue =
    paymentMethod === "cash" && tendered != null ? r2(tendered - total) : null;

  try {
    let number: string;
    if (orderId) {
      const guard = await requireOpen(orderId);
      if (!guard.ok) return { ok: false, error: guard.error };
      number = guard.order.number;
    } else {
      number = await nextOrderNumber();
    }

    await db.transaction(async (tx) => {
      const settle = {
        status: "paid" as const,
        type,
        reference,
        subtotal: subtotal.toFixed(2),
        discount: safeDiscount.toFixed(2),
        tax: taxAmount.toFixed(2),
        taxRate: taxRate.toFixed(3),
        total: total.toFixed(2),
        paymentMethod,
        tendered: tendered != null ? tendered.toFixed(2) : null,
        changeDue: changeDue != null ? changeDue.toFixed(2) : null,
        servedBy: user.id,
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
      await writeItems(tx, id, lines);
      // Settling is the point of sale — burn the recipe stock now. Open tabs
      // (saveOrder) deliberately don't deduct, so this fires exactly once.
      await applyRecipeDeductions(tx, lines, user.id);
    });

    bumpPaths();
    return {
      ok: true,
      orderNumber: number,
      subtotal: subtotal.toFixed(2),
      discount: safeDiscount.toFixed(2),
      tax: taxAmount.toFixed(2),
      taxLabel: store.taxLabel,
      total: total.toFixed(2),
      changeDue: changeDue != null ? changeDue.toFixed(2) : null,
    };
  } catch {
    return { ok: false, error: "Something fizzled at the till. Try again." };
  }
}

// Cancel an open tab without taking payment.
export async function voidOrder(orderId: string): Promise<VoidResult> {
  await getCurrentUser();
  const guard = await requireOpen(orderId);
  if (!guard.ok) return { ok: false, error: guard.error };
  try {
    await db
      .update(orders)
      .set({ status: "void", updatedAt: new Date() })
      .where(eq(orders.id, orderId));
    bumpPaths();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not void the order." };
  }
}

function bumpPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/till");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/inventory");
}
