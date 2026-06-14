import "server-only";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  expenses,
  menuCategories,
  menuItems,
  orderItems,
  orders,
} from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import type { DateRange } from "@/lib/store/date-range";

export type Metric = {
  value: number;
  prev: number; // same metric over the previous period
};

export type SeriesPoint = {
  label: string;
  value: number; // total revenue in the bucket
  ts: number;
  // OHLC of individual order totals within the bucket — for the candlestick
  // view. When the bucket had no orders these are 0.
  open: number;
  high: number;
  low: number;
  close: number;
  count: number; // orders in the bucket
};
export type Slice = { label: string; value: number; count: number };
export type TopItem = {
  name: string;
  units: number;
  revenue: number;
};

export type Analytics = {
  // Headline metrics with prior-period comparison.
  revenue: Metric;
  orders: Metric;
  avgOrder: Metric;
  tax: Metric;
  discounts: Metric;
  expenses: Metric;
  netProfit: Metric;
  // Breakdowns for the current period.
  trend: SeriesPoint[]; // revenue over time (daily or hourly)
  trendUnit: "hour" | "day";
  byPayment: Slice[];
  byType: Slice[];
  byCategory: Slice[];
  topItems: TopItem[];
  busiestLabel: string | null; // peak day/hour by revenue
};

const n = (v: string | number | null | undefined) => Number(v ?? 0);
const r2 = (x: number) => Math.round(x * 100) / 100;

// The server's IANA timezone. Time buckets are truncated in this zone so they
// line up with the local wall-clock the dashboard renders (the DB may store
// timestamps in UTC). Falls back to UTC if the runtime can't resolve a zone.
const SERVER_TZ =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

// Sum paid-order revenue/tax/discount and order count in a window.
async function paidTotals(start: Date, end: Date) {
  const [row] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`.mapWith(Number),
      tax: sql<number>`coalesce(sum(${orders.tax}), 0)`.mapWith(Number),
      discount: sql<number>`coalesce(sum(${orders.discount}), 0)`.mapWith(Number),
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
  return row ?? { revenue: 0, tax: 0, discount: 0, count: 0 };
}

// Sum expenses in a window (expenseDate is a date column, compared as YYYY-MM-DD
// in local time to match the date the user keyed).
function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function expenseTotal(start: Date, end: Date) {
  const startS = localDate(start);
  const endS = localDate(end);
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number),
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.storeId, STORE_ID),
        sql`${expenses.deletedAt} is null`,
        gte(expenses.expenseDate, startS),
        lt(expenses.expenseDate, endS),
      ),
    );
  return n(row?.total);
}

// Compile the full analytics report for a range, with prior-period comparison.
export async function getAnalytics(
  range: DateRange,
  prev: DateRange,
  hourly: boolean,
): Promise<Analytics> {
  const { start, end } = range;

  const [cur, prior, curExp, priorExp, payRows, typeRows, catRows, topRows, trendRows] =
    await Promise.all([
      paidTotals(start, end),
      paidTotals(prev.start, prev.end),
      expenseTotal(start, end),
      expenseTotal(prev.start, prev.end),
      // By payment method.
      db
        .select({
          key: orders.paymentMethod,
          value: sql<number>`coalesce(sum(${orders.total}), 0)`.mapWith(Number),
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
        )
        .groupBy(orders.paymentMethod),
      // By order type.
      db
        .select({
          key: orders.type,
          value: sql<number>`coalesce(sum(${orders.total}), 0)`.mapWith(Number),
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
        )
        .groupBy(orders.type),
      // By menu category (via order items -> menu item -> category).
      db
        .select({
          key: menuCategories.name,
          value: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)`.mapWith(Number),
          count: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`.mapWith(Number),
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
        .where(
          and(
            eq(orders.storeId, STORE_ID),
            eq(orders.status, "paid"),
            gte(orders.paidAt, start),
            lt(orders.paidAt, end),
          ),
        )
        .groupBy(menuCategories.name),
      // Top items by units (snapshotted name so deleted items still count).
      db
        .select({
          name: orderItems.name,
          units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`.mapWith(Number),
          revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)`.mapWith(Number),
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orders.storeId, STORE_ID),
            eq(orders.status, "paid"),
            gte(orders.paidAt, start),
            lt(orders.paidAt, end),
          ),
        )
        .groupBy(orderItems.name)
        .orderBy(sql`sum(${orderItems.quantity}) desc`)
        .limit(8),
      // Revenue trend, bucketed by hour or day. Also computes OHLC of the
      // individual order totals within each bucket for the candlestick view:
      // open = first order, close = last, high = max, low = min.
      db
        .select({
          bucket: hourly
            ? sql<string>`to_char(date_trunc('hour', (${orders.paidAt} at time zone 'UTC') at time zone ${SERVER_TZ}), 'YYYY-MM-DD HH24:00')`
            : sql<string>`to_char(date_trunc('day', (${orders.paidAt} at time zone 'UTC') at time zone ${SERVER_TZ}), 'YYYY-MM-DD')`,
          value: sql<number>`coalesce(sum(${orders.total}), 0)`.mapWith(Number),
          count: sql<number>`count(*)`.mapWith(Number),
          high: sql<number>`coalesce(max(${orders.total}), 0)`.mapWith(Number),
          low: sql<number>`coalesce(min(${orders.total}), 0)`.mapWith(Number),
          open: sql<number>`coalesce((array_agg(${orders.total} order by ${orders.paidAt} asc))[1], 0)`.mapWith(Number),
          close: sql<number>`coalesce((array_agg(${orders.total} order by ${orders.paidAt} desc))[1], 0)`.mapWith(Number),
        })
        .from(orders)
        .where(
          and(
            eq(orders.storeId, STORE_ID),
            eq(orders.status, "paid"),
            gte(orders.paidAt, start),
            lt(orders.paidAt, end),
          ),
        )
        .groupBy(sql`1`)
        .orderBy(sql`1`),
    ]);

  const revenue = r2(cur.revenue);
  const prevRevenue = r2(prior.revenue);
  const netProfit = r2(revenue - cur.tax - curExp);
  const prevNet = r2(prevRevenue - prior.tax - priorExp);
  const avg = cur.count > 0 ? r2(revenue / cur.count) : 0;
  const prevAvg = prior.count > 0 ? r2(prevRevenue / prior.count) : 0;

  const PAY_LABEL: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    online: "Online",
  };
  const TYPE_LABEL: Record<string, string> = {
    dine_in: "Dine in",
    takeaway: "Takeaway",
    delivery: "Delivery",
  };

  const byPayment: Slice[] = payRows
    .map((r) => ({
      label: PAY_LABEL[r.key ?? ""] ?? "Other",
      value: r2(r.value),
      count: r.count,
    }))
    .sort((a, b) => b.value - a.value);

  const byType: Slice[] = typeRows
    .map((r) => ({
      label: TYPE_LABEL[r.key ?? ""] ?? "Other",
      value: r2(r.value),
      count: r.count,
    }))
    .sort((a, b) => b.value - a.value);

  const byCategory: Slice[] = catRows
    .map((r) => ({
      label: r.key ?? "Uncategorised",
      value: r2(r.value),
      count: r.count,
    }))
    .sort((a, b) => b.value - a.value);

  const topItems: TopItem[] = topRows.map((r) => ({
    name: r.name,
    units: r.units,
    revenue: r2(r.revenue),
  }));

  // Build a dense trend series (fill empty buckets with 0) so the chart shows
  // gaps as flat, not collapsed.
  const trend = buildTrend(trendRows, range, hourly);
  const busiest = [...trend].sort((a, b) => b.value - a.value)[0];

  return {
    revenue: { value: revenue, prev: prevRevenue },
    orders: { value: cur.count, prev: prior.count },
    avgOrder: { value: avg, prev: prevAvg },
    tax: { value: r2(cur.tax), prev: r2(prior.tax) },
    discounts: { value: r2(cur.discount), prev: r2(prior.discount) },
    expenses: { value: r2(curExp), prev: r2(priorExp) },
    netProfit: { value: netProfit, prev: prevNet },
    trend,
    trendUnit: hourly ? "hour" : "day",
    byPayment,
    byType,
    byCategory,
    topItems,
    busiestLabel: busiest && busiest.value > 0 ? busiest.label : null,
  };
}

// Densify the bucketed rows across the whole range so the chart has a point per
// hour/day even when there were no sales. Carries OHLC through for candles.
type TrendRow = {
  bucket: string;
  value: number;
  count: number;
  high: number;
  low: number;
  open: number;
  close: number;
};

function buildTrend(
  rows: TrendRow[],
  range: DateRange,
  hourly: boolean,
): SeriesPoint[] {
  const map = new Map(rows.map((r) => [r.bucket, r]));
  const out: SeriesPoint[] = [];
  const step = hourly ? 3_600_000 : 86_400_000;
  const cursor = new Date(range.start);

  while (cursor.getTime() < range.end.getTime()) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    const h = String(cursor.getHours()).padStart(2, "0");
    const key = hourly ? `${y}-${m}-${d} ${h}:00` : `${y}-${m}-${d}`;
    const label = hourly
      ? `${h}:00`
      : cursor.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
    const row = map.get(key);
    out.push({
      label,
      value: r2(row?.value ?? 0),
      ts: cursor.getTime(),
      open: r2(row?.open ?? 0),
      high: r2(row?.high ?? 0),
      low: r2(row?.low ?? 0),
      close: r2(row?.close ?? 0),
      count: row?.count ?? 0,
    });
    cursor.setTime(cursor.getTime() + step);
  }
  return out;
}
