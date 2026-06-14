"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventoryItems,
  inventoryItemForm,
  stockMovements,
  stockMovementForm,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { STORE_ID } from "@/lib/store/constants";
import { parseId } from "@/lib/store/ids";

export type InventoryState = { ok: boolean; error?: string };

// Inventory is shaped by admins and managers; staff have read-only access.
async function requireEditor(): Promise<{ id: string } | { error: string }> {
  const user = await getCurrentUser();
  if (user.role !== "admin" && user.role !== "manager") {
    return { error: "Only admins and managers can edit inventory." };
  }
  return { id: user.id };
}

function bump() {
  revalidatePath("/dashboard/inventory");
}

// ---- Items --------------------------------------------------------------

export async function createInventoryItem(
  _prev: InventoryState,
  formData: FormData,
): Promise<InventoryState> {
  const auth = await requireEditor();
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = inventoryItemForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const { quantity } = parsed.data;
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(inventoryItems)
        .values({ ...parsed.data, storeId: STORE_ID, enteredBy: auth.id })
        .returning({ id: inventoryItems.id });
      // Seed an opening-stock movement so history is complete from day one.
      if (Number(quantity) > 0) {
        await tx.insert(stockMovements).values({
          itemId: created.id,
          type: "receive",
          delta: quantity,
          resulting: quantity,
          note: "Opening stock",
          enteredBy: auth.id,
        });
      }
    });
    bump();
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}

export async function updateInventoryItem(
  _prev: InventoryState,
  formData: FormData,
): Promise<InventoryState> {
  const auth = await requireEditor();
  if ("error" in auth) return { ok: false, error: auth.error };

  const id = parseId(formData.get("id"));
  if (!id) return { ok: false, error: "Invalid item." };

  const parsed = inventoryItemForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Editing item details should not silently move stock — quantity changes go
  // through stock movements. Build the update set without quantity.
  const { name, sku, category, unit, reorderLevel, costPerUnit, supplier } = parsed.data;
  const details = { name, sku, category, unit, reorderLevel, costPerUnit, supplier };

  try {
    await db
      .update(inventoryItems)
      .set({ ...details, updatedAt: new Date() })
      .where(
        and(
          eq(inventoryItems.id, id),
          eq(inventoryItems.storeId, STORE_ID),
          isNull(inventoryItems.deletedAt),
        ),
      );
    bump();
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}

export async function deleteInventoryItem(
  _prev: InventoryState,
  formData: FormData,
): Promise<InventoryState> {
  const auth = await requireEditor();
  if ("error" in auth) return { ok: false, error: auth.error };

  const id = parseId(formData.get("id"));
  if (!id) return { ok: false, error: "Invalid item." };

  try {
    await db
      .update(inventoryItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.storeId, STORE_ID)));
    bump();
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}

// ---- Stock movements ----------------------------------------------------

export async function recordStockMovement(
  _prev: InventoryState,
  formData: FormData,
): Promise<InventoryState> {
  const auth = await requireEditor();
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = stockMovementForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { itemId, type, amount, note } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
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
      if (!item) return { error: "Unknown item." };

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

      if (resulting < 0) return { error: "Not enough stock for that movement." };

      await tx.insert(stockMovements).values({
        itemId,
        type,
        delta: delta.toFixed(3),
        resulting: resulting.toFixed(3),
        note,
        enteredBy: auth.id,
      });
      await tx
        .update(inventoryItems)
        .set({ quantity: resulting.toFixed(3), updatedAt: new Date() })
        .where(eq(inventoryItems.id, itemId));
      return { ok: true as const };
    });

    if ("error" in result) return { ok: false, error: result.error };
    bump();
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}
