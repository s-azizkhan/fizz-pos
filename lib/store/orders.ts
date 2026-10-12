import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
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
import { fromDateInput, monthBounds, resolvePreset } from "@/lib/store/date-range";

export type OrderWithItems = Order & { items: OrderItem[] };

// A KOT ticket carries its own age, measured by the DATABASE. `created_at` is a
// `timestamp` without a time zone, so the client would read it as local time and
// be wrong by the UTC offset — on a board whose entire job is "how long has this
// been waiting", that is the one number that must not drift.
// Only what the board draws — it re-polls every few seconds, so every column
// shipped here is paid for on the kitchen's link all day.
type KotItem = Pick<OrderItem, "id" | "name" | "variantName" | "quantity">;
export type KotTicket = Pick<Order, "id" | "number" | "status" | "type" | "reference" | "kitchenStatus"> & {
  ageSeconds: number;
  items: KotItem[];
};

// List orders for the store created in a YYYY-MM month, newest first. Open
// tabs always show regardless of month — they're still live. Optional status
// filter (open/paid/void). Items are attached so the orders page can preview lines.
export async function listOrders(
  month: string,
  status?: OrderStatus,
): Promise<OrderWithItems[]> {
  const [start, end] = monthBounds(month).map(fromDateInput);
  const inMonth = and(gte(orders.createdAt, start), lt(orders.createdAt, end));
  const where = and(
    eq(orders.storeId, STORE_ID),
    or(eq(orders.status, "open"), inMonth),
    status ? eq(orders.status, status) : undefined,
  );

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
// The board only covers the current month, so stale tickets from earlier
// months that were never bumped don't clog the lanes forever.
function inCurrentMonth() {
  const { start, end } = resolvePreset("this_month");
  return and(gte(orders.createdAt, start), lt(orders.createdAt, end));
}

export async function listKot(lane: KitchenStatus): Promise<KotTicket[]> {
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      type: orders.type,
      reference: orders.reference,
      kitchenStatus: orders.kitchenStatus,
      ageSeconds: sql<number>`extract(epoch from (now() - ${orders.createdAt}))`.mapWith(Number),
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, STORE_ID),
        ne(orders.status, "void"),
        eq(orders.kitchenStatus, lane),
        inCurrentMonth(),
      ),
    )
    .orderBy(lane === "ready" ? desc(orders.createdAt) : asc(orders.createdAt))
    .limit(lane === "ready" ? 10 : 200);
  if (rows.length === 0) return [];

  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      name: orderItems.name,
      variantName: orderItems.variantName,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, rows.map((o) => o.id)));

  const byOrder = new Map<string, KotItem[]>();
  for (const { orderId, ...it } of items) {
    const list = byOrder.get(orderId) ?? [];
    list.push(it);
    byOrder.set(orderId, list);
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
    .where(
      and(eq(orders.storeId, STORE_ID), ne(orders.status, "void"), inCurrentMonth()),
    )
    .groupBy(orders.kitchenStatus);

  const out: Record<KitchenStatus, number> = { new: 0, accepted: 0, ready: 0 };
  for (const r of rows) out[r.lane] = r.count;
  return out;
}

// Count of currently-open tabs — used for the POS/orders badge.
export async function openOrderCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(orders)
    .where(and(eq(orders.storeId, STORE_ID), eq(orders.status, "open")));
  return row?.count ?? 0;
}
