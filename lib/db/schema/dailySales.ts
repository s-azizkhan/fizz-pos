import { date, index, numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./user";
import { store } from "./store";

// One row per trading day: how the day's takings split across payment types.
// Money stored as numeric(12,2) strings to avoid float drift.
export const dailySales = pgTable("daily_sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  saleDate: date("sale_date").notNull(),
  cashSale: numeric("cash_sale", { precision: 12, scale: 2 }).notNull().default("0"),
  onlineSale: numeric("online_sale", { precision: 12, scale: 2 }).notNull().default("0"),
  creditSale: numeric("credit_sale", { precision: 12, scale: 2 }).notNull().default("0"),
  // Who keyed the entry. Keep history even if the user is later removed.
  enteredBy: uuid("entered_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Soft delete — null means active.
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  // Listed per store, newest first by trading date.
  index("daily_sales_store_date_idx").on(t.storeId, t.saleDate),
]);

export type DailySale = typeof dailySales.$inferSelect;

// Accept a money amount as string/number from the form, validate >= 0,
// normalize to a 2-decimal string for storage.
const money = z
  .coerce.number({ error: "Enter a valid amount" })
  .min(0, "Cannot be negative")
  .max(99999999.99, "Too large")
  .transform((n) => n.toFixed(2));

export const dailySaleForm = z.object({
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  cashSale: money,
  onlineSale: money,
  creditSale: money,
});
export type DailySaleInput = z.infer<typeof dailySaleForm>;
