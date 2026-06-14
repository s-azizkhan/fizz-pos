import "server-only";
import { desc, eq, isNull, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailySales, users, type DailySale } from "@/lib/db/schema";

export type DailySaleRow = DailySale & {
  enteredByName: string | null;
  total: string;
};

// List active (not soft-deleted) entries, newest sale date first, with the
// name of whoever keyed each one.
export async function listDailySales(): Promise<DailySaleRow[]> {
  const rows = await db
    .select({
      sale: dailySales,
      enteredByName: users.name,
    })
    .from(dailySales)
    .leftJoin(users, eq(dailySales.enteredBy, users.id))
    .where(isNull(dailySales.deletedAt))
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

export async function getDailySale(id: number): Promise<DailySale | undefined> {
  const [row] = await db
    .select()
    .from(dailySales)
    .where(and(eq(dailySales.id, id), isNull(dailySales.deletedAt)))
    .limit(1);
  return row;
}
