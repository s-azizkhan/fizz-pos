import "server-only";
import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailySales, users, type DailySale } from "@/lib/db/schema";
import { currentStoreId } from "@/lib/auth/dal";
import { monthBounds } from "@/lib/store/date-range";

export type DailySaleRow = DailySale & {
  enteredByName: string | null;
  total: string;
};

// List active (not soft-deleted) entries in a YYYY-MM month, newest sale date
// first, with the name of whoever keyed each one.
export async function listDailySales(month: string): Promise<DailySaleRow[]> {
  const sid = await currentStoreId();
  const [start, end] = monthBounds(month);
  const rows = await db
    .select({
      sale: dailySales,
      enteredByName: users.name,
    })
    .from(dailySales)
    .leftJoin(users, eq(dailySales.enteredBy, users.id))
    .where(
      and(
        eq(dailySales.storeId, sid),
        isNull(dailySales.deletedAt),
        gte(dailySales.saleDate, start),
        lt(dailySales.saleDate, end),
      ),
    )
    .orderBy(desc(dailySales.saleDate), desc(dailySales.id));

  return rows.map(({ sale, enteredByName }) => ({
    ...sale,
    enteredByName,
    total: (
      Number(sale.cashSale) +
      Number(sale.onlineSale) +
      Number(sale.creditSale)
    ).toFixed(2),
  }));
}

export async function getDailySale(id: string): Promise<DailySale | undefined> {
  const sid = await currentStoreId();
  const [row] = await db
    .select()
    .from(dailySales)
    .where(
      and(
        eq(dailySales.id, id),
        eq(dailySales.storeId, sid),
        isNull(dailySales.deletedAt),
      ),
    )
    .limit(1);
  return row;
}
