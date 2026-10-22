import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orderItems,
  orders,
  type Order,
  type OrderItem,
  type KitchenStatus,
} from "@/lib/db/schema";
import { currentStoreId } from "@/lib/auth/dal";
import { fromDateInput, monthBounds, resolvePreset, toDateInput } from "@/lib/store/date-range";
import { customersByIds } from "@/lib/store/customers";
import type { LoadedOrder } from "@/components/fizz/pos/types";
import type { OrderRow } from "@/components/fizz/orders/types";

export type OrderWithItems = Order & { items: OrderItem[] };

// A KOT ticket carries its own age, measured by the DATABASE. `created_at` is a
// `timestamp` without a time zone, so the client would read it as local time and
// be wrong by the UTC offset — on a board whose entire job is "how long has this
// been waiting", that is the one number that must not drift.
// Only what the board draws — it re-polls every few seconds, so every column
// shipped here is paid for on the kitchen's link all day.
type KotItem = Pick<OrderItem, "id" | "name" | "variantName" | "quantity">;
export type KotTicket = Pick<Order, "id" | "number" | "status" | "type" | "reference" | "kitchenStatus" | "webPending"> & {
  ageSeconds: number;
  items: KotItem[];
};

// A tab as the POS edits it. Shared by the POS page (online, ?order=) and the
// Orders page, which ships it on every open tab so the POS can pick the tab up
// from the device when the network can't.
export function toLoadedOrder(o: OrderWithItems, customer: LoadedOrder["customer"]): LoadedOrder {
  return {
    id: o.id,
    number: o.number,
    type: o.type,
    reference: o.reference,
    webPending: o.webPending,
    source: o.source,
    customer,
    discount: Number(o.discount),
    fees: {
      service: Number(o.serviceFee),
      packaging: Number(o.packagingFee),
      delivery: Number(o.deliveryFee),
    },
    lines: o.items.map((it) => ({
      key: it.comboId
        ? `combo:${it.comboId}`
        : it.variantId
          ? `${it.menuItemId}:${it.variantId}`
          : (it.menuItemId ?? it.id),
      menuItemId: it.menuItemId ?? "",
      variantId: it.variantId,
      comboId: it.comboId,
      name: it.name,
      variantName: it.variantName,
      unitPrice: Number(it.unitPrice),
      quantity: it.quantity,
    })),
  };
}

async function withItems(rows: Order[]): Promise<OrderWithItems[]> {
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

// Orders page, one page at a time: every open tab (still live, any month) on
// the first page, then the month's closed orders newest first. Voided orders
// only for admins — nobody else is shown them. Rows are client-ready and lean:
// a busy month used to ship every order with its lines twice.
// With a month: that month, paged. Without: the first page is the whole latest
// day with sales (today, or the last day that had any); later pages walk back
// through older days `limit` orders at a time.
export async function listOrders(
  month: string | undefined,
  opts: { offset: number; limit: number; includeVoid: boolean },
): Promise<{ rows: OrderRow[]; hasMore: boolean }> {
  const sid = await currentStoreId();
  const closedOf = and(
    eq(orders.storeId, sid),
    ne(orders.status, "open"),
    opts.includeVoid ? undefined : ne(orders.status, "void"),
  );
  const [start, end] = month ? monthBounds(month).map(fromDateInput) : [];
  let limit = opts.limit;
  if (!month && opts.offset === 0) {
    const [latest] = await db
      .select({ at: orders.createdAt })
      .from(orders)
      .where(closedOf)
      .orderBy(desc(orders.createdAt))
      .limit(1);
    if (latest) {
      const day = fromDateInput(toDateInput(latest.at));
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(orders)
        .where(and(closedOf, gte(orders.createdAt, day)));
      limit = n;
    }
  }
  const [open, closed] = await Promise.all([
    opts.offset === 0
      ? db
          .select()
          .from(orders)
          .where(and(eq(orders.storeId, sid), eq(orders.status, "open")))
          .orderBy(desc(orders.createdAt))
      : Promise.resolve([]),
    db
      .select()
      .from(orders)
      .where(
        and(
          closedOf,
          start ? gte(orders.createdAt, start) : undefined,
          end ? lt(orders.createdAt, end) : undefined,
        ),
      )
      .orderBy(desc(orders.createdAt))
      .offset(opts.offset)
      .limit(limit + 1),
  ]);
  const hasMore = closed.length > limit;
  const [full, people] = await Promise.all([
    withItems([...open, ...closed.slice(0, limit)]),
    customersByIds(
      [...open, ...closed].map((o) => o.customerId).filter((id): id is string => !!id),
    ),
  ]);

  const rows = full.map((o): OrderRow => ({
    id: o.id,
    number: o.number,
    status: o.status,
    type: o.type,
    source: o.source,
    reference: o.reference,
    total: o.total,
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    itemCount: o.items.reduce((n, it) => n + it.quantity, 0),
    customer: people.find((c) => c.id === o.customerId) ?? null,
    items: o.items.map((it) => ({
      name: it.name,
      variantName: it.variantName,
      quantity: it.quantity,
      lineTotal: it.lineTotal,
    })),
    // What a reprinted receipt needs beyond the lines; header/currency/tax
    // label are page-wide and sent once.
    bill:
      o.status === "paid"
        ? {
            subtotal: o.subtotal,
            discount: o.discount,
            tax: o.tax,
            fees: { service: o.serviceFee, packaging: o.packagingFee, delivery: o.deliveryFee },
            changeDue: o.changeDue,
          }
        : null,
    tab:
      o.status === "open"
        ? toLoadedOrder(o, people.find((c) => c.id === o.customerId) ?? null)
        : null,
  }));
  return { rows, hasMore };
}

// Fetch a single order with its lines, scoped to the store. Null if missing.
export async function getOrder(id: string): Promise<OrderWithItems | null> {
  const sid = await currentStoreId();
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.storeId, sid)))
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
  const sid = await currentStoreId();
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      type: orders.type,
      reference: orders.reference,
      kitchenStatus: orders.kitchenStatus,
      webPending: orders.webPending,
      ageSeconds: sql<number>`extract(epoch from (now() - ${orders.createdAt}))`.mapWith(Number),
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, sid),
        ne(orders.status, "void"),
        // Guest web orders wait for staff to accept them (or pay) before the kitchen sees them.
        or(eq(orders.webPending, false), eq(orders.status, "paid")),
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
  const sid = await currentStoreId();
  const rows = await db
    .select({
      lane: orders.kitchenStatus,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, sid),
        ne(orders.status, "void"),
        // Guest web orders wait for staff to accept them (or pay) before the kitchen sees them.
        or(eq(orders.webPending, false), eq(orders.status, "paid")),
        inCurrentMonth(),
      ),
    )
    .groupBy(orders.kitchenStatus);

  const out: Record<KitchenStatus, number> = { new: 0, accepted: 0, ready: 0 };
  for (const r of rows) out[r.lane] = r.count;
  return out;
}

// Guest web orders nobody has accepted yet — what the new-order alarm rings
// for. Polled from every dashboard screen, so it returns three columns only.
export async function pendingWebOrders() {
  const sid = await currentStoreId();
  return db
    .select({ id: orders.id, number: orders.number })
    .from(orders)
    .where(
      and(eq(orders.storeId, sid), eq(orders.status, "open"), eq(orders.webPending, true)),
    )
    .orderBy(asc(orders.createdAt))
    .limit(20);
}

// Count of currently-open tabs — used for the POS/orders badge.
export async function openOrderCount(): Promise<number> {
  const sid = await currentStoreId();
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(orders)
    .where(and(eq(orders.storeId, sid), eq(orders.status, "open")));
  return row?.count ?? 0;
}
