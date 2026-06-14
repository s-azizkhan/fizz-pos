import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orderItems,
  orders,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";

export type OrderWithItems = Order & { items: OrderItem[] };

// List orders for the store, newest first. Optional status filter (open/paid/
// void). Items are attached so the orders page can preview lines.
export async function listOrders(
  status?: OrderStatus,
): Promise<OrderWithItems[]> {
  const where = status
    ? and(eq(orders.storeId, STORE_ID), eq(orders.status, status))
    : eq(orders.storeId, STORE_ID);

  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt));
  if (rows.length === 0) return [];

  const ids = rows.map((o) => o.id);
  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, ids));

  const byOrder = new Map<string, OrderItem[]>();
  for (const it of items) {
    const list = byOrder.get(it.orderId) ?? [];
    list.push(it);
    byOrder.set(it.orderId, list);
  }
  return rows.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }));
}

// Fetch a single order with its lines, scoped to the store. Null if missing.
export async function getOrder(id: string): Promise<OrderWithItems | null> {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.storeId, STORE_ID)))
    .limit(1);
  if (!row) return null;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(orderItems.name);
  return { ...row, items };
}

// Count of currently-open tabs — used for the Till/orders badge.
export async function openOrderCount(): Promise<number> {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.storeId, STORE_ID), eq(orders.status, "open")));
  return rows.length;
}
