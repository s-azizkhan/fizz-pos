import { index, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./user";
import { store } from "./store";

// Units an inventory item is measured in. First value is the column default.
export const inventoryUnit = pgEnum("inventory_unit", [
  "each",
  "g",
  "kg",
  "ml",
  "l",
  "pack",
  "box",
  "bag",
]);
export type InventoryUnit = (typeof inventoryUnit.enumValues)[number];

export const INVENTORY_UNIT_LABELS: Record<InventoryUnit, string> = {
  each: "each",
  g: "grams (g)",
  kg: "kilograms (kg)",
  ml: "millilitres (ml)",
  l: "litres (L)",
  pack: "pack",
  box: "box",
  bag: "bag",
};

// Broad stock categories for the café floor.
export const INVENTORY_CATEGORIES = [
  "Coffee",
  "Dairy",
  "Bakery",
  "Produce",
  "Dry Goods",
  "Beverages",
  "Packaging",
  "Cleaning",
  "Other",
] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

// A tracked stock item. `quantity` is the live on-hand amount, kept in sync by
// stock movements. Money stored as numeric strings to avoid float drift.
export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku"),
  category: text("category").notNull().default("Other"),
  unit: inventoryUnit("unit").notNull().default("each"),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull().default("0"),
  reorderLevel: numeric("reorder_level", { precision: 14, scale: 3 }).notNull().default("0"),
  costPerUnit: numeric("cost_per_unit", { precision: 12, scale: 2 }).notNull().default("0"),
  supplier: text("supplier"),
  enteredBy: uuid("entered_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  // Inventory is listed per store (active rows).
  index("inventory_items_store_idx").on(t.storeId),
]);
export type InventoryItem = typeof inventoryItems.$inferSelect;

// Why a stock level changed. `receive` adds, `waste`/`sale` remove, `adjust`
// sets an absolute count (a manual recount).
export const stockMovementType = pgEnum("stock_movement_type", [
  "receive",
  "waste",
  "sale",
  "adjust",
]);
export type StockMovementType = (typeof stockMovementType.enumValues)[number];

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  receive: "Received",
  waste: "Waste / loss",
  sale: "Used / sold",
  adjust: "Recount",
};

// An immutable log of every stock change. `delta` is the signed change applied;
// `resulting` snapshots the on-hand quantity right after the movement.
export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  type: stockMovementType("type").notNull(),
  delta: numeric("delta", { precision: 14, scale: 3 }).notNull(),
  resulting: numeric("resulting", { precision: 14, scale: 3 }).notNull(),
  note: text("note"),
  enteredBy: uuid("entered_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  // Movement history is read per item, newest first.
  index("stock_movements_item_idx").on(t.itemId),
]);
export type StockMovement = typeof stockMovements.$inferSelect;

// ---- Validation ---------------------------------------------------------

const qty = z
  .coerce.number({ error: "Enter a valid number" })
  .min(0, "Cannot be negative")
  .max(99999999.999, "Too large")
  .transform((n) => n.toFixed(3));

const money = z
  .coerce.number({ error: "Enter a valid amount" })
  .min(0, "Cannot be negative")
  .max(99999999.99, "Too large")
  .transform((n) => n.toFixed(2));

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || null);

export const inventoryItemForm = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  sku: optionalText(60),
  category: z.enum(INVENTORY_CATEGORIES, "Pick a category"),
  unit: z.enum(inventoryUnit.enumValues, "Pick a unit"),
  quantity: qty,
  reorderLevel: qty,
  costPerUnit: money,
  supplier: optionalText(120),
});
export type InventoryItemInput = z.infer<typeof inventoryItemForm>;

// Stock movement form: `amount` is always a positive magnitude; the action
// derives the signed delta from the movement `type`.
export const stockMovementForm = z.object({
  itemId: z.uuid("Unknown item"),
  type: z.enum(stockMovementType.enumValues, "Pick a movement type"),
  amount: z
    .coerce.number({ error: "Enter a valid number" })
    .min(0, "Cannot be negative")
    .max(99999999.999, "Too large"),
  note: optionalText(200),
});
export type StockMovementInput = z.infer<typeof stockMovementForm>;
