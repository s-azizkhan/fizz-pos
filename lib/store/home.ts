import "server-only";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import { listInventory } from "@/lib/store/inventory";
import { resolvePreset } from "@/lib/store/date-range";

export type HomeKpi = { value: number; prev: number };

export type RecentOrder = {
  id: string;
  number: string;
  status: "open" | "paid" | "void";
  type: string;
  reference: string | null;
  total: number;
  itemCount: number;
  at: string; // ISO timestamp (paidAt or createdAt)
};

export type LowStockItem = { id: string; name: string; qty: number; unit: string };

export type HomeSnapshot = {
  // Today's headline numbers (compared to yesterday).
  revenueToday: HomeKpi;
  ordersToday: HomeKpi;
  avgToday: HomeKpi;
  // Hourly revenue for today's sparkline (one value per hour, 0-filled).
  todaySpark: number[];
  // This week's daily revenue (Mon..today) for a mini bar series.
  weekSpark: { label: string; value: number }[];
  weekRevenue: number;
  // Operational attention.
  openTabs: number;
  openTabsValue: number;
  lowStock: LowStockItem[];
  lowStockCount: number;
  // Recent activity feed.
  recent: RecentOrder[];
};

const r2 = (x: number) => Math.round(x * 100) / 100;

// Truncate time buckets in the server's local zone so they match the rendered
// wall-clock (timestamps may be stored in UTC).
const SERVER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

async function paid(start: Date, end: Date) {
  const [row] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(orders)
    .where(
      and(
        eq(orders.storeId, STORE_ID),
        eq(orders.status, "paid"),
        gte(orders.paidAt, start),
        lt(orders.paidAt, end),
      ),
    );
  return row ?? { revenue: 0, count: 0 };
}

// Aggregate everything the home dashboard needs in one pass. Role filtering is
// done by the page — this returns the full snapshot.
export async function getHomeSnapshot(): Promise<HomeSnapshot> {
  const today = resolvePreset("today");
  const yesterday = resolvePreset("yesterday");
  const week = resolvePreset("this_week");

  const [
    todayTot,
    yTot,
    todayHours,
    weekDays,
    openAgg,
    recentRows,
    inventory,
  ] = await Promise.all([
    paid(today.start, today.end),
    paid(yesterday.start, yesterday.end),
    // Hourly revenue for today (bucketed in the server timezone).
    db
      .select({
        h: sql<number>`extract(hour from (${orders.paidAt} at time zone 'UTC') at time zone ${SERVER_TZ})`.mapWith(Number),
        v: sql<number>`coalesce(sum(${orders.total}), 0)`.mapWith(Number),
      })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, STORE_ID),
          eq(orders.status, "paid"),
          gte(orders.paidAt, today.start),
          lt(orders.paidAt, today.end),
        ),
      )
      .groupBy(sql`1`),
    // Daily revenue this week (bucketed in the server timezone).
    db
      .select({
        d: sql<string>`to_char(date_trunc('day', (${orders.paidAt} at time zone 'UTC') at time zone ${SERVER_TZ}), 'YYYY-MM-DD')`,
        v: sql<number>`coalesce(sum(${orders.total}), 0)`.mapWith(Number),
      })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, STORE_ID),
          eq(orders.status, "paid"),
          gte(orders.paidAt, week.start),
          lt(orders.paidAt, week.end),
        ),
      )
      .groupBy(sql`1`),
    // Open tabs count + outstanding value.
    db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
        value: sql<number>`coalesce(sum(${orders.total}), 0)`.mapWith(Number),
      })
      .from(orders)
      .where(and(eq(orders.storeId, STORE_ID), eq(orders.status, "open"))),
    // Recent orders (any status except void), newest first.
    db
      .select({
        id: orders.id,
        number: orders.number,
        status: orders.status,
        type: orders.type,
        reference: orders.reference,
        total: orders.total,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
        items: sql<number>`(select coalesce(sum(oi.quantity),0) from order_items oi where oi.order_id = ${orders.id})`.mapWith(Number),
      })
      .from(orders)
      .where(and(eq(orders.storeId, STORE_ID), sql`${orders.status} <> 'void'`))
      .orderBy(desc(orders.createdAt))
      .limit(6),
    listInventory(),
  ]);

  // Today's hourly sparkline (0..23).
  const todaySpark = Array.from({ length: 24 }, () => 0);
  for (const r of todayHours) {
    if (r.h >= 0 && r.h < 24) todaySpark[r.h] = r2(r.v);
  }

  // This week's daily series, dense Mon..end.
  const weekMap = new Map(weekDays.map((r) => [r.d, r.v]));
  const weekSpark: { label: string; value: number }[] = [];
  const cur = new Date(week.start);
  while (cur.getTime() < week.end.getTime()) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    weekSpark.push({
      label: cur.toLocaleDateString("en-US", { weekday: "short" }),
      value: r2(weekMap.get(key) ?? 0),
    });
    cur.setDate(cur.getDate() + 1);
  }
  const weekRevenue = r2(weekSpark.reduce((s, d) => s + d.value, 0));

  const low = inventory.filter((i) => i.lowStock);

  return {
    revenueToday: { value: r2(todayTot.revenue), prev: r2(yTot.revenue) },
    ordersToday: { value: todayTot.count, prev: yTot.count },
    avgToday: {
      value: todayTot.count ? r2(todayTot.revenue / todayTot.count) : 0,
      prev: yTot.count ? r2(yTot.revenue / yTot.count) : 0,
    },
    todaySpark,
    weekSpark,
    weekRevenue,
    openTabs: openAgg[0]?.count ?? 0,
    openTabsValue: r2(openAgg[0]?.value ?? 0),
    lowStock: low.slice(0, 5).map((i) => ({
      id: i.id,
      name: i.name,
      qty: Number(i.quantity),
      unit: i.unit,
    })),
    lowStockCount: low.length,
    recent: recentRows.map((r) => ({
      id: r.id,
      number: r.number,
      status: r.status,
      type: r.type,
      reference: r.reference,
      total: Number(r.total),
      itemCount: r.items,
      at: (r.paidAt ?? r.createdAt).toISOString(),
    })),
  };
}
