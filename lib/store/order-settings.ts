import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderSettings, type OrderSettings } from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";

// Lazily create the store's ordering-config row, then return it. Same pattern
// as getStore(). Memoized per render.
export const getOrderSettings = cache(async (): Promise<OrderSettings> => {
  const [row] = await db
    .select()
    .from(orderSettings)
    .where(eq(orderSettings.storeId, STORE_ID))
    .limit(1);
  if (row) return row;
  const [created] = await db
    .insert(orderSettings)
    .values({ storeId: STORE_ID })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  // Lost the insert race — read it back.
  const [again] = await db
    .select()
    .from(orderSettings)
    .where(eq(orderSettings.storeId, STORE_ID))
    .limit(1);
  return again;
});
