import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderSettings, type OrderSettings } from "@/lib/db/schema";
import { getStore } from "@/lib/store/data";
import { cached, storeTag } from "@/lib/store/cache";
import { currentStoreId } from "@/lib/auth/dal";
import type { ReceiptData } from "@/lib/print/templates";

// Lazily create a store's ordering-config row, then return it. Cached across
// requests under the store's tag (the menu settings modal writes both
// together), memoized per render.
async function loadOrderSettings(storeId: string): Promise<OrderSettings> {
  const [row] = await db
    .select()
    .from(orderSettings)
    .where(eq(orderSettings.storeId, storeId))
    .limit(1);
  if (row) return row;
  const [created] = await db
    .insert(orderSettings)
    .values({ storeId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  // Lost the insert race — read it back.
  const [again] = await db
    .select()
    .from(orderSettings)
    .where(eq(orderSettings.storeId, storeId))
    .limit(1);
  return again;
}
export const getOrderSettingsById = cache((storeId: string) =>
  cached(`order-settings:${storeId}`, storeTag(storeId), () => loadOrderSettings(storeId))(),
);
export const getOrderSettings = cache(async () => getOrderSettingsById(await currentStoreId()));

// Store header/footer fields a printed receipt needs (checkout + reprints).
export async function receiptStore(): Promise<ReceiptData["store"]> {
  const [s, o] = await Promise.all([getStore(), getOrderSettings()]);
  return {
    name: s.name,
    addressLine1: s.addressLine1,
    addressLine2: s.addressLine2,
    phone: s.phone,
    website: s.website,
    instagram: s.instagram,
    delivery: o.delivery,
  };
}
