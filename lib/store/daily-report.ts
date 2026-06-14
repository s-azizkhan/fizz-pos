import "server-only";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import { getAnalytics, type Analytics } from "@/lib/store/analytics";
import { resolvePreset } from "@/lib/store/date-range";
import { listInventory } from "@/lib/store/inventory";
import { formatMoney } from "@/lib/store/format";

export type DayInsight = {
  kind: "good" | "warn" | "info";
  title: string;
  detail: string;
  href?: string;
};

export type DailyReport = {
  dateLabel: string; // human label for "today"
  analytics: Analytics; // today vs yesterday
  // Cash reconciliation: what should be in the drawer.
  cashSales: number; // settled cash revenue today
  cashChangeGiven: number; // change handed back today (informational)
  // Hour highlights.
  peakHour: { label: string; value: number } | null;
  quietHour: { label: string; value: number } | null;
  // Operational tails.
  openTabs: number;
  openTabsValue: number;
  lowStockCount: number;
  voided: number; // voided orders today
  firstSale: string | null; // human time of first paid order
  lastSale: string | null; // human time of last paid order
  insights: DayInsight[];
};

const r2 = (x: number) => Math.round(x * 100) / 100;

// Compile the end-of-day report for the current trading day, with actionable
// insights derived from today's numbers compared to yesterday.
export async function getDailyReport(currency: string): Promise<DailyReport> {
  const money = (x: number) => formatMoney(x, currency);
  const today = resolvePreset("today");
  const yesterday = resolvePreset("yesterday");

  const [analytics, dayOrders, inventory] = await Promise.all([
    // Hourly trend for a single day.
    getAnalytics(today, yesterday, true),
    db
      .select({
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        total: orders.total,
        changeDue: orders.changeDue,
        tendered: orders.tendered,
        paidAt: orders.paidAt,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, STORE_ID),
          gte(orders.createdAt, today.start),
          lt(orders.createdAt, today.end),
        ),
      )
      .orderBy(asc(orders.createdAt)),
    listInventory(),
  ]);

  // Cash reconciliation from settled cash orders.
  const cashPaid = dayOrders.filter(
    (o) => o.status === "paid" && o.paymentMethod === "cash",
  );
  const cashSales = r2(cashPaid.reduce((s, o) => s + Number(o.total), 0));
  const cashChangeGiven = r2(
    cashPaid.reduce((s, o) => s + Number(o.changeDue ?? 0), 0),
  );

  const paidToday = dayOrders.filter((o) => o.status === "paid" && o.paidAt);
  const openTabsRows = dayOrders.filter((o) => o.status === "open");
  const voided = dayOrders.filter((o) => o.status === "void").length;

  // Peak and quiet hours, from buckets that actually had revenue.
  const active = analytics.trend.filter((t) => t.value > 0);
  const peak = [...active].sort((a, b) => b.value - a.value)[0] ?? null;
  const quiet = [...active].sort((a, b) => a.value - b.value)[0] ?? null;

  const low = inventory.filter((i) => i.lowStock);
  const openValue = r2(
    openTabsRows.reduce((s, o) => s + Number(o.total), 0),
  );

  const firstSale = paidToday[0]?.paidAt
    ? fmtTime(paidToday[0].paidAt)
    : null;
  const lastSale = paidToday.at(-1)?.paidAt
    ? fmtTime(paidToday.at(-1)!.paidAt!)
    : null;

  // ---- Actionable insights -------------------------------------------------
  const insights: DayInsight[] = [];

  // Revenue vs yesterday.
  const rev = analytics.revenue;
  if (rev.prev > 0) {
    const pct = Math.round(((rev.value - rev.prev) / rev.prev) * 100);
    if (pct >= 10)
      insights.push({
        kind: "good",
        title: `Up ${pct}% on yesterday`,
        detail: `Today's revenue is ahead of yesterday's same-time total. Keep the momentum.`,
      });
    else if (pct <= -10)
      insights.push({
        kind: "warn",
        title: `Down ${Math.abs(pct)}% on yesterday`,
        detail: `Revenue is behind yesterday. Consider a push on top sellers or a quick promo.`,
        href: "/dashboard/menu",
      });
  }

  if (openTabsRows.length > 0)
    insights.push({
      kind: "warn",
      title: `${openTabsRows.length} tab${openTabsRows.length === 1 ? "" : "s"} still open`,
      detail: `${money(openValue)} not yet settled. Close these before cashing up.`,
      href: "/dashboard/orders",
    });

  if (low.length > 0)
    insights.push({
      kind: "warn",
      title: `${low.length} item${low.length === 1 ? "" : "s"} low on stock`,
      detail: `Restock before tomorrow to avoid running out: ${low
        .slice(0, 3)
        .map((i) => i.name)
        .join(", ")}${low.length > 3 ? "…" : ""}.`,
      href: "/dashboard/inventory",
    });

  if (peak)
    insights.push({
      kind: "info",
      title: `Busiest at ${peak.label}`,
      detail: `Your strongest hour by revenue. Make sure you're well staffed around then.`,
    });

  if (analytics.topItems[0])
    insights.push({
      kind: "good",
      title: `Top seller: ${analytics.topItems[0].name}`,
      detail: `${analytics.topItems[0].units} sold today. Keep it front-of-mind and well stocked.`,
    });

  if (voided > 0)
    insights.push({
      kind: "info",
      title: `${voided} order${voided === 1 ? "" : "s"} voided`,
      detail: `Voids today. Worth a quick check that nothing's being lost at the till.`,
      href: "/dashboard/orders",
    });

  if (Number(analytics.discounts.value) > 0)
    insights.push({
      kind: "info",
      title: `${money(analytics.discounts.value)} given in discounts`,
      detail: `Discounts applied today — fine if intentional, worth watching if not.`,
    });

  if (insights.length === 0)
    insights.push({
      kind: "info",
      title: "Quiet so far",
      detail: "No sales recorded yet today. Ring your first order at the Till.",
      href: "/dashboard/till",
    });

  return {
    dateLabel: today.start.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    analytics,
    cashSales,
    cashChangeGiven,
    peakHour: peak ? { label: peak.label, value: peak.value } : null,
    quietHour: quiet ? { label: quiet.label, value: quiet.value } : null,
    openTabs: openTabsRows.length,
    openTabsValue: openValue,
    lowStockCount: low.length,
    voided,
    firstSale,
    lastSale,
    insights,
  };
}

// Fixed-locale time label (HH:MM AM/PM) so it's stable server→client.
function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
