import {
  index,
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

// Lifecycle. `open` = a running tab still being built/eaten (editable);
// `paid` = settled and closed; `void` = cancelled.
export const orderStatus = pgEnum("order_status", ["open", "paid", "void"]);
export type OrderStatus = (typeof orderStatus.enumValues)[number];

// A sale rung at the till. Starts `open` (a tab you can revisit and edit) and
// becomes `paid` when settled. Money stored as numeric(12,2) strings to avoid
// float drift, matching the rest of the schema.
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  // Human-facing receipt number from the store's order numbering config.
  number: text("number").notNull(),
  status: orderStatus("status").notNull().default("open"),
  type: orderType("type").notNull().default("dine_in"),
  // Optional table / tab label keyed at the till.
  reference: text("reference"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  // Tax charged on the (discounted) subtotal. `taxRate` snapshots the % used.
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 6, scale: 3 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  // Null until settled. An open tab has no payment yet.
  paymentMethod: orderPaymentMethod("payment_method"),
  // What the customer handed over, and the change owed (cash flows).
  tendered: numeric("tendered", { precision: 12, scale: 2 }),
  changeDue: numeric("change_due", { precision: 12, scale: 2 }),
  // Who opened / last touched the order. Keep history even if user removed.
  servedBy: uuid("served_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // When it was settled (paid). Null while open.
  paidAt: timestamp("paid_at"),
}, (t) => [
  // Open-tab / paid-history listings filter by store + status.
  index("orders_store_status_idx").on(t.storeId, t.status),
  // Analytics aggregate paid orders over a paidAt window.
  index("orders_store_paid_at_idx").on(t.storeId, t.paidAt),
  // Recent-orders feeds order by createdAt within a store.
  index("orders_store_created_at_idx").on(t.storeId, t.createdAt),
]);
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
}, (t) => [
  // Lines are always fetched/joined by their order.
  index("order_items_order_id_idx").on(t.orderId),
  // Top-seller / category analytics group by the source menu item.
  index("order_items_menu_item_id_idx").on(t.menuItemId),
]);
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
  // When set, settle this existing open tab instead of creating a new order.
  orderId: z.uuid().optional(),
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

// Save (create or update) an open tab without taking payment. Allows an empty
// cart on update so you can clear a tab down, but new tabs need a line.
export const saveOrderSchema = z.object({
  orderId: z.uuid().optional(),
  type: z.enum(orderType.enumValues).default("dine_in"),
  reference: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  discount: money.default(0),
  items: z.array(lineSchema).min(1, "Add at least one item"),
});
export type SaveOrderInput = z.infer<typeof saveOrderSchema>;
