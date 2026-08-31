import { boolean, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { store } from "./store";

// Public-menu ordering config, one row per store. Kept off the `store` table
// so ordering can grow (fees, zones, hours) without widening the profile row.
export const orderSettings = pgTable("order_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .unique()
    .references(() => store.id, { onDelete: "cascade" }),
  // Master switch: show the cart on /m/[slug].
  ordering: boolean("ordering").notNull().default(false),
  // Where orders land. Digits only, country code included (wa.me format).
  whatsapp: text("whatsapp"),
  // Fulfilment modes offered to the guest.
  dineIn: boolean("dine_in").notNull().default(true),
  takeaway: boolean("takeaway").notNull().default(true),
  delivery: boolean("delivery").notNull().default(false),
  // Flat fee added when the guest picks delivery. Money is a string — never
  // do float math on it.
  deliveryFee: numeric("delivery_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  // Per-item packaging charge, added on takeaway and delivery (not dine-in).
  packagingFee: numeric("packaging_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type OrderSettings = typeof orderSettings.$inferSelect;

// Form shape (not a standalone schema) so it can be merged with the menu
// appearance fields — the admin edits both in one modal, one submit.
// Checkbox semantics: an unchecked box sends nothing, so every flag defaults
// to false here even where the column defaults to true.
export const orderSettingsShape = {
  ordering: z.union([z.boolean(), z.stringbool()]).default(false),
  // wa.me needs a country code; 8+ digits after stripping punctuation.
  whatsapp: z
    .string()
    .trim()
    .max(24)
    .optional()
    .or(z.literal(""))
    .transform((v) => v?.replace(/\D/g, "") || null)
    .refine((v) => v === null || v.length >= 8, "Use a full number with country code"),
  dineIn: z.union([z.boolean(), z.stringbool()]).default(false),
  takeaway: z.union([z.boolean(), z.stringbool()]).default(false),
  delivery: z.union([z.boolean(), z.stringbool()]).default(false),
  deliveryFee: z.coerce
    .number({ error: "Enter a valid delivery fee" })
    .min(0, "Cannot be negative")
    .max(100000, "That's a long drive")
    .transform((n) => n.toFixed(2)),
  packagingFee: z.coerce
    .number({ error: "Enter a valid packaging charge" })
    .min(0, "Cannot be negative")
    .max(100000, "That's a lot of boxes")
    .transform((n) => n.toFixed(2)),
};

export const orderSettingsForm = z.object(orderSettingsShape);
export type OrderSettingsInput = z.infer<typeof orderSettingsForm>;
