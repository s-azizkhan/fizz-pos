import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { store, type Store } from "@/lib/db/schema";
import { formatDocNumber } from "@/lib/store/format";
import { featureOn, type FeatureKey } from "@/lib/store/features";
import { cached, storeTag } from "@/lib/store/cache";
import { currentStoreId } from "@/lib/auth/dal";
import { planLocks, planStatus } from "@/lib/store/plans";

// Plan-locked features are forced off on top of the café's own switches, so
// every featureOn()/nav/featureGate check downstream needs no plan awareness.
// Applied AFTER the cache read: entitlement depends on the clock.
export function withPlan<T extends Pick<Store, "plan" | "planExpiresAt" | "trialEndsAt" | "disabledFeatures">>(row: T): T {
  const locks = planLocks(planStatus(row).plan);
  if (!locks.length) return row;
  return { ...row, disabledFeatures: [...new Set([...row.disabledFeatures, ...locks])] };
}

// One store row, UNCACHED — use where the counters must be exact (Store
// settings edits nextOrderSeq/nextInvoiceSeq, which every sale bumps without
// busting the cache). Rows are created at signup, never lazily.
export async function loadStore(storeId: string): Promise<Store> {
  const [row] = await db.select().from(store).where(eq(store.id, storeId)).limit(1);
  if (!row) throw new Error(`store ${storeId} not found`);
  return row;
}

// Cached across requests (tag store:<id>), memoized per render. Writers call
// bust(storeTag(id)). The seq counters in it may lag — claim numbers with
// nextOrderNumber().
export const getStoreById = cache(async (storeId: string) =>
  withPlan(await cached(`store-row:${storeId}`, storeTag(storeId), () => loadStore(storeId))()),
);

// The signed-in user's store: what every dashboard page, layout and feature
// check reads.
export const getStore = cache(async () => getStoreById(await currentStoreId()));

// Atomically claim the next invoice number: increment seq, format with the
// claimed value. Use when creating a real invoice.
export async function nextInvoiceNumber(storeId: string): Promise<string> {
  const [row] = await db
    .update(store)
    .set({ nextInvoiceSeq: sql`${store.nextInvoiceSeq} + 1` })
    .where(eq(store.id, storeId))
    .returning();
  const claimed = row.nextInvoiceSeq - 1;
  return formatDocNumber(row.invoiceNumberFormat, {
    prefix: row.invoicePrefix,
    seq: claimed,
    date: new Date(),
  });
}

export async function nextOrderNumber(storeId: string): Promise<string> {
  const [row] = await db
    .update(store)
    .set({ nextOrderSeq: sql`${store.nextOrderSeq} + 1` })
    .where(eq(store.id, storeId))
    .returning();
  const claimed = row.nextOrderSeq - 1;
  return formatDocNumber(row.orderNumberFormat, {
    prefix: row.orderPrefix,
    seq: claimed,
    date: new Date(),
  });
}

// Page guard for an optional feature: switched off = bounce to the dashboard.
export async function requireFeature(key: FeatureKey) {
  if (!featureOn((await getStore()).disabledFeatures, key)) redirect("/dashboard");
}
