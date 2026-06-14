"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkoutSchema, orderItems, orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { STORE_ID } from "@/lib/store/constants";
import { nextOrderNumber } from "@/lib/store/data";

export type CheckoutResult =
  | { ok: true; orderNumber: string; total: string; changeDue: string | null }
  | { ok: false; error: string };

// Ring up a cart at the till. Snapshots line names/prices so the receipt is
// stable regardless of later menu edits. Anyone on staff can take payment.
export async function checkout(payload: unknown): Promise<CheckoutResult> {
  const user = await getCurrentUser();

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order" };
  }
  const { type, reference, paymentMethod, discount, tendered, items } = parsed.data;

  // Recompute totals server-side — never trust client math.
  const lines = items.map((l) => ({
    ...l,
    lineTotal: Math.round(l.unitPrice * l.quantity * 100) / 100,
  }));
  const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  const safeDiscount = Math.min(discount, subtotal);
  const total = Math.round((subtotal - safeDiscount) * 100) / 100;

  if (paymentMethod === "cash" && tendered != null && tendered < total) {
    return { ok: false, error: "Cash tendered is less than the total." };
  }
  const changeDue =
    paymentMethod === "cash" && tendered != null
      ? Math.round((tendered - total) * 100) / 100
      : null;

  try {
    const number = await nextOrderNumber();
    await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          storeId: STORE_ID,
          number,
          type,
          reference,
          subtotal: subtotal.toFixed(2),
          discount: safeDiscount.toFixed(2),
          total: total.toFixed(2),
          paymentMethod,
          tendered: tendered != null ? tendered.toFixed(2) : null,
          changeDue: changeDue != null ? changeDue.toFixed(2) : null,
          servedBy: user.id,
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        lines.map((l) => ({
          orderId: order.id,
          menuItemId: l.menuItemId ?? null,
          variantId: l.variantId ?? null,
          name: l.name,
          variantName: l.variantName ?? null,
          unitPrice: l.unitPrice.toFixed(2),
          quantity: l.quantity,
          lineTotal: l.lineTotal.toFixed(2),
        })),
      );
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/till");
    return {
      ok: true,
      orderNumber: number,
      total: total.toFixed(2),
      changeDue: changeDue != null ? changeDue.toFixed(2) : null,
    };
  } catch {
    return { ok: false, error: "Something fizzled at the till. Try again." };
  }
}
