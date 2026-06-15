import "server-only";
import { inArray } from "drizzle-orm";
import type { db } from "@/lib/db";
import { inventoryItems, recipeComponents, stockMovements } from "@/lib/db/schema";

// The transaction handle Drizzle hands to a `db.transaction(async (tx) => …)`
// callback. Same trick used in app/actions/order.ts#writeItems.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// A sold line, minimal shape: which menu item/variant and how many.
type SoldLine = {
  menuItemId?: string | null;
  variantId?: string | null;
  quantity: number;
};

// Deduct raw stock for a settled order from its menu recipes. Runs INSIDE the
// checkout transaction so stock and the sale commit atomically.
//
// Design rules:
//  - Lines with no menuItemId (manual/custom rings) have no recipe → skipped.
//  - A sold variant uses its own recipe rows; if it has none it falls back to
//    the item's base recipe (variantId null).
//  - Stock is allowed to go negative. An off-by count must never block a sale;
//    a negative on-hand surfaces the deficit instead of hiding it.
//  - Defensive: an item with no recipe simply contributes nothing. No throws
//    for missing data — only a real DB error rolls the sale back.
export async function applyRecipeDeductions(
  tx: Tx,
  lines: SoldLine[],
  enteredBy: string,
): Promise<void> {
  const menuItemIds = [
    ...new Set(lines.map((l) => l.menuItemId).filter((id): id is string => !!id)),
  ];
  if (menuItemIds.length === 0) return;

  const components = await tx
    .select()
    .from(recipeComponents)
    .where(inArray(recipeComponents.menuItemId, menuItemIds));
  if (components.length === 0) return;

  // Index components: base recipe per item, plus any variant-specific overrides.
  const base = new Map<string, typeof components>(); // menuItemId -> rows
  const byVariant = new Map<string, typeof components>(); // variantId -> rows
  for (const c of components) {
    if (c.variantId) {
      const list = byVariant.get(c.variantId) ?? [];
      list.push(c);
      byVariant.set(c.variantId, list);
    } else {
      const list = base.get(c.menuItemId) ?? [];
      list.push(c);
      base.set(c.menuItemId, list);
    }
  }

  // Aggregate total consumption per inventory item across every line.
  const used = new Map<string, number>();
  for (const line of lines) {
    if (!line.menuItemId) continue;
    const recipe =
      (line.variantId && byVariant.get(line.variantId)) ||
      base.get(line.menuItemId);
    if (!recipe) continue;
    for (const c of recipe) {
      const amount = Number(c.quantity) * line.quantity;
      used.set(c.inventoryItemId, (used.get(c.inventoryItemId) ?? 0) + amount);
    }
  }
  if (used.size === 0) return;

  // Read current on-hand for the touched items, then write one sale movement
  // and one quantity update each.
  const ids = [...used.keys()];
  const current = await tx
    .select({ id: inventoryItems.id, quantity: inventoryItems.quantity })
    .from(inventoryItems)
    .where(inArray(inventoryItems.id, ids));

  for (const item of current) {
    const amount = used.get(item.id) ?? 0;
    if (amount <= 0) continue;
    const resulting = Number(item.quantity) - amount;
    await tx.insert(stockMovements).values({
      itemId: item.id,
      type: "sale",
      delta: (-amount).toFixed(3),
      resulting: resulting.toFixed(3),
      note: "Auto: order settled",
      enteredBy,
    });
    await tx
      .update(inventoryItems)
      .set({ quantity: resulting.toFixed(3), updatedAt: new Date() })
      .where(inArray(inventoryItems.id, [item.id]));
  }
}
