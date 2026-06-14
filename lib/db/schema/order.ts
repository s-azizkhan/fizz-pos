import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./user";
import { store } from "./store";

// How a finished order was paid. Mirrors the daily-sales split so totals
// reconcile across the two surfaces.
export const orderPaymentMethod = pgEnum("order_payment_method", [
  "cash",
  "card",
  "online",
]);
export type OrderPaymentMethod = (typeof orderPaymentMethod.enumValues)[number];

// Where the order is served. Drives kitchen routing later; for now it's a tag.
export const orderType = pgEnum("order_type", ["dine_in", "takeaway", "delivery"]);
export type OrderType = (typeof orderType.enumValues)[number];

// A completed sale rung at the till. Money stored as numeric(12,2) strings to
// avoid float drift, matching the rest of the schema.
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  // Human-facing receipt number from the store's order numbering config.
  number: text("number").notNull(),
  type: orderType("type").notNull().default("dine_in"),
  // Optional table / tab label keyed at the till.
  reference: text("reference"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: orderPaymentMethod("payment_method").notNull().default("cash"),
  // What the customer handed over, and the change owed (cash flows).
  tendered: numeric("tendered", { precision: 12, scale: 2 }),
  changeDue: numeric("change_due", { precision: 12, scale: 2 }),
  // Who rang it. Keep history even if the user is later removed.
  servedBy: uuid("served_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Order = typeof orders.$inferSelect;

// One row per line in the cart. Name/price are snapshotted so the receipt is
// stable even if the menu item is later edited or deleted.
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  // Soft references — kept nullable so menu edits never orphan an order.
  menuItemId: uuid("menu_item_id"),
  variantId: uuid("variant_id"),
  name: text("name").notNull(),
  variantName: text("variant_name"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
});
export type OrderItem = typeof orderItems.$inferSelect;

// --- Checkout payload (client -> server action) -----------------------------

const money = z
  .coerce.number({ error: "Enter a valid amount" })
  .min(0, "Cannot be negative")
  .max(99999999.99, "Too large");

const lineSchema = z.object({
  menuItemId: z.uuid().nullable().optional(),
  variantId: z.uuid().nullable().optional(),
  name: z.string().trim().min(1).max(160),
  variantName: z.string().trim().max(120).nullable().optional(),
  unitPrice: money,
  quantity: z.coerce.number().int().min(1).max(999),
});

export const checkoutSchema = z.object({
  type: z.enum(orderType.enumValues).default("dine_in"),
  reference: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  paymentMethod: z.enum(orderPaymentMethod.enumValues).default("cash"),
  discount: money.default(0),
  tendered: money.optional(),
  items: z.array(lineSchema).min(1, "Add at least one item"),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
