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

// What the KITCHEN has done with the order, tracked separately from payment —
// a paid order still has to be cooked, and a dine-in tab is cooked long before
// it settles. `ready` is final. Order matters: first value is the default.
export const kitchenStatus = pgEnum("kitchen_status", ["new", "accepted", "ready"]);
export type KitchenStatus = (typeof kitchenStatus.enumValues)[number];

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
  // Kitchen lane, independent of `status`. See kitchenStatus above.
  // ponytail: no per-transition timestamps — the board only needs "how long has
  // this been waiting", which createdAt already answers. Add acceptedAt/readyAt
  // when you want cook-time analytics.
  kitchenStatus: kitchenStatus("kitchen_status").notNull().default("new"),
  type: orderType("type").notNull().default("dine_in"),
  // Optional table / tab label keyed at the till.
  reference: text("reference"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  // Tax charged on the (discounted) subtotal. `taxRate` snapshots the % used.
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 6, scale: 3 }).notNull().default("0"),
  // Flat add-ons keyed at the till. Charged after tax, never taxed themselves.
  serviceFee: numeric("service_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  packagingFee: numeric("packaging_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  deliveryFee: numeric("delivery_fee", { precision: 12, scale: 2 }).notNull().default("0"),
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
  // The KOT board polls by store + kitchen lane, oldest first.
  index("orders_store_kitchen_status_idx").on(t.storeId, t.kitchenStatus),
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

// Flat fees added to an order. Delivery is dropped server-side unless the order
// type is `delivery`.
const feesSchema = z
  .object({
    service: money.default(0),
    packaging: money.default(0),
    delivery: money.default(0),
  })
  .default({ service: 0, packaging: 0, delivery: 0 });
export type OrderFees = z.infer<typeof feesSchema>;

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
  fees: feesSchema,
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
  fees: feesSchema,
  items: z.array(lineSchema).min(1, "Add at least one item"),
});
export type SaveOrderInput = z.infer<typeof saveOrderSchema>;

// The kitchen only ever moves an order forward a lane.
export const kitchenMoveSchema = z.object({
  orderId: z.uuid(),
  to: z.enum(["accepted", "ready"]),
});
export type KitchenMoveInput = z.infer<typeof kitchenMoveSchema>;
