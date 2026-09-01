import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orderItems,
  orders,
  type Order,
  type OrderItem,
  type KitchenStatus,
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

// The kitchen board. Payment is irrelevant here — a paid takeaway still has to
// be cooked — so this filters on the kitchen lane and only drops voided orders.
// OLDEST FIRST: the queue is a queue, so the newest ticket lands at the back.
// `ready` is final and unbounded, so that lane is capped; the working lanes are
// small by nature and returned whole.
export async function listKot(
  lane: KitchenStatus,
): Promise<OrderWithItems[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.storeId, STORE_ID),
        ne(orders.status, "void"),
        eq(orders.kitchenStatus, lane),
      ),
    )
    .orderBy(lane === "ready" ? desc(orders.createdAt) : asc(orders.createdAt))
    .limit(lane === "ready" ? 30 : 200);
  if (rows.length === 0) return [];

  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, rows.map((o) => o.id)));

  const byOrder = new Map<string, OrderItem[]>();
  for (const it of items) {
    const list = byOrder.get(it.orderId) ?? [];
    list.push(it);
    byOrder.set(it.orderId, list);
  }
  return rows.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }));
}

// Lane counts drive the tab badges, so a cook can see work piling up in a lane
// they aren't looking at.
export async function kotCounts(): Promise<Record<KitchenStatus, number>> {
  const rows = await db
    .select({
      lane: orders.kitchenStatus,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(orders)
    .where(and(eq(orders.storeId, STORE_ID), ne(orders.status, "void")))
    .groupBy(orders.kitchenStatus);

  const out: Record<KitchenStatus, number> = { new: 0, accepted: 0, ready: 0 };
  for (const r of rows) out[r.lane] = r.count;
  return out;
}

// Count of currently-open tabs — used for the Till/orders badge.
export async function openOrderCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(orders)
    .where(and(eq(orders.storeId, STORE_ID), eq(orders.status, "open")));
  return row?.count ?? 0;
}
