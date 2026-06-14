import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  menuCategories,
  menuItems,
  menuItemVariants,
  orderItems,
  orders,
} from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";

export type ItemMargin = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  margin: number; // price - cost
  marginPct: number; // margin / price
  foodCostPct: number; // cost / price
  available: boolean;
  hasCost: boolean;
  // Realized performance from paid orders.
  unitsSold: number;
  revenue: number;
  profit: number; // revenue - (cost * unitsSold)
};

export type MarginsSummary = {
  items: ItemMargin[];
  // Store-wide rollups (realized, from paid orders).
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  blendedMarginPct: number;
  itemsWithoutCost: number;
  // Theoretical (menu-wide averages).
  avgMarginPct: number;
};

function pct(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

// Build the margins report: per menu item, theoretical margin from price/cost
// plus realized profit pulled from paid order lines. Variants are flattened by
// using their own cost when set, otherwise the parent item cost.
export async function getMargins(): Promise<MarginsSummary> {
  const [cats, items, variants, soldRows] = await Promise.all([
    db
      .select({ id: menuCategories.id, name: menuCategories.name })
      .from(menuCategories)
      .where(and(eq(menuCategories.storeId, STORE_ID), isNull(menuCategories.deletedAt))),
    db
      .select()
      .from(menuItems)
      .where(isNull(menuItems.deletedAt)),
    db.select().from(menuItemVariants),
    // Realized sales per menu item from PAID orders only.
    db
      .select({
        menuItemId: orderItems.menuItemId,
        units: sql<number>`sum(${orderItems.quantity})`.mapWith(Number),
        revenue: sql<number>`sum(${orderItems.lineTotal})`.mapWith(Number),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(orders.storeId, STORE_ID), eq(orders.status, "paid")))
      .groupBy(orderItems.menuItemId),
  ]);

  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const sold = new Map(
    soldRows
      .filter((r) => r.menuItemId)
      .map((r) => [r.menuItemId as string, { units: r.units, revenue: r.revenue }]),
  );

  // Average variant cost per item (fallback to item cost handled below).
  const variantCostByItem = new Map<string, number[]>();
  for (const v of variants) {
    const list = variantCostByItem.get(v.itemId) ?? [];
    list.push(Number(v.cost));
    variantCostByItem.set(v.itemId, list);
  }

  const out: ItemMargin[] = items.map((it) => {
    const price = Number(it.price);
    // Use the item cost; if it's 0 but variants carry cost, use their average.
    let cost = Number(it.cost);
    if (cost === 0) {
      const vc = (variantCostByItem.get(it.id) ?? []).filter((c) => c > 0);
      if (vc.length) cost = vc.reduce((s, c) => s + c, 0) / vc.length;
    }
    const margin = price - cost;
    const perf = sold.get(it.id) ?? { units: 0, revenue: 0 };
    const profit = perf.revenue - cost * perf.units;
    return {
      id: it.id,
      name: it.name,
      category: catName.get(it.categoryId) ?? "—",
      price,
      cost,
      margin,
      marginPct: pct(margin, price),
      foodCostPct: pct(cost, price),
      available: it.available,
      hasCost: cost > 0,
      unitsSold: perf.units,
      revenue: perf.revenue,
      profit,
    };
  });

  const totalRevenue = out.reduce((s, i) => s + i.revenue, 0);
  const totalCost = out.reduce((s, i) => s + i.cost * i.unitsSold, 0);
  const totalProfit = totalRevenue - totalCost;
  const withCost = out.filter((i) => i.hasCost && i.price > 0);
  const avgMarginPct =
    withCost.length > 0
      ? withCost.reduce((s, i) => s + i.marginPct, 0) / withCost.length
      : 0;

  return {
    items: out,
    totalRevenue,
    totalCost,
    totalProfit,
    blendedMarginPct: pct(totalProfit, totalRevenue),
    itemsWithoutCost: out.filter((i) => !i.hasCost).length,
    avgMarginPct,
  };
}
