import "server-only";
import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { store, type Store } from "@/lib/db/schema";
import { formatDocNumber } from "@/lib/store/format";

const STORE_ID = 1;

// Lazily create the singleton store row, then return it. Memoized per render.
export const getStore = cache(async (): Promise<Store> => {
  const rows = await db.select().from(store).where(eq(store.id, STORE_ID)).limit(1);
  if (rows[0]) return rows[0];
  const [created] = await db
    .insert(store)
    .values({ id: STORE_ID })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  // Lost the insert race — read it back.
  const [row] = await db.select().from(store).where(eq(store.id, STORE_ID)).limit(1);
  return row;
});

// Atomically claim the next invoice number: increment seq, format with the
// claimed value. Use when creating a real invoice.
export async function nextInvoiceNumber(): Promise<string> {
  await getStore(); // ensure row exists
  const [row] = await db
    .update(store)
    .set({ nextInvoiceSeq: sql`${store.nextInvoiceSeq} + 1` })
    .where(eq(store.id, STORE_ID))
    .returning();
  const claimed = row.nextInvoiceSeq - 1;
  return formatDocNumber(row.invoiceNumberFormat, {
    prefix: row.invoicePrefix,
    seq: claimed,
    date: new Date(),
  });
}

export async function nextOrderNumber(): Promise<string> {
  await getStore();
  const [row] = await db
    .update(store)
    .set({ nextOrderSeq: sql`${store.nextOrderSeq} + 1` })
    .where(eq(store.id, STORE_ID))
    .returning();
  const claimed = row.nextOrderSeq - 1;
  return formatDocNumber(row.orderNumberFormat, {
    prefix: row.orderPrefix,
    seq: claimed,
    date: new Date(),
  });
}
