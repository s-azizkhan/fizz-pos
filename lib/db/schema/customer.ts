import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { store } from "./store";

// A café's regulars. Scoped per store; the phone number is the identity, so the
// same number never lands twice in one café. Name-only customers are allowed
// (walk-ins who won't share a number).
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  name: text("name"),
  // Normalised: digits with an optional leading +. See normalisePhone.
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  // One customer per number per café. Nulls don't collide in Postgres.
  uniqueIndex("customers_store_phone_uq").on(t.storeId, t.phone),
  // POS search matches name by prefix/substring, case-insensitive.
  index("customers_store_name_idx").on(t.storeId, sql`lower(${t.name})`),
]);
export type Customer = typeof customers.$inferSelect;

// "+91 98765-43210" → "+919876543210". Blank → null.
export function normalisePhone(v: string | null | undefined) {
  const p = (v ?? "").trim().replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return p.replace(/\+/g, "") ? p : null;
}
