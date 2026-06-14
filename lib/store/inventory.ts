import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventoryItems,
  stockMovements,
  users,
  type InventoryItem,
  type StockMovement,
} from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";

export type InventoryItemRow = InventoryItem & {
  enteredByName: string | null;
  lowStock: boolean;
  stockValue: string;
};

function decorate(
  item: InventoryItem & { enteredByName: string | null },
): InventoryItemRow {
  const qty = Number(item.quantity);
  const reorder = Number(item.reorderLevel);
  return {
    ...item,
    lowStock: reorder > 0 && qty <= reorder,
    stockValue: (qty * Number(item.costPerUnit)).toFixed(2),
  };
}

// List active stock items for this store, alphabetical, with the name of the
// person who created each one.
export async function listInventory(): Promise<InventoryItemRow[]> {
  const rows = await db
    .select({ item: inventoryItems, enteredByName: users.name })
    .from(inventoryItems)
    .leftJoin(users, eq(inventoryItems.enteredBy, users.id))
    .where(and(eq(inventoryItems.storeId, STORE_ID), isNull(inventoryItems.deletedAt)))
    .orderBy(inventoryItems.name);

  return rows.map(({ item, enteredByName }) => decorate({ ...item, enteredByName }));
}

export async function getInventoryItem(
  id: string,
): Promise<InventoryItem | undefined> {
  const [row] = await db
    .select()
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.id, id),
        eq(inventoryItems.storeId, STORE_ID),
        isNull(inventoryItems.deletedAt),
      ),
    )
    .limit(1);
  return row;
}

export type StockMovementRow = StockMovement & { enteredByName: string | null };

// Recent stock movements for a single item, newest first.
export async function listMovements(
  itemId: string,
  limit = 50,
): Promise<StockMovementRow[]> {
  const rows = await db
    .select({ movement: stockMovements, enteredByName: users.name })
    .from(stockMovements)
    .leftJoin(users, eq(stockMovements.enteredBy, users.id))
    .where(eq(stockMovements.itemId, itemId))
    .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
    .limit(limit);

  return rows.map(({ movement, enteredByName }) => ({ ...movement, enteredByName }));
}

// Lightweight totals for the inventory header.
export async function inventorySummary(rows: InventoryItemRow[]) {
  return {
    count: rows.length,
    lowCount: rows.filter((r) => r.lowStock).length,
    totalValue: rows.reduce((s, r) => s + Number(r.stockValue), 0).toFixed(2),
  };
}
