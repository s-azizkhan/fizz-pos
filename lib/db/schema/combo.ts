import { boolean, index, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { store } from "./store";
import { menuItems, menuItemVariants } from "./menu";

// A combo / bundle: a few menu items sold together at one (usually lower)
// price. Pinned to the top of the POS grid and the public menu. Soft-deleted.
export const menuCombos = pgTable("menu_combos", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  available: boolean("available").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [index("menu_combos_store_idx").on(t.storeId)]);
export type MenuCombo = typeof menuCombos.$inferSelect;

// One component of a combo. Deleting the item/variant drops the row; the combo
// then reads as incomplete and hides from sale until it's edited.
export const menuComboItems = pgTable("menu_combo_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  comboId: uuid("combo_id")
    .notNull()
    .references(() => menuCombos.id, { onDelete: "cascade" }),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => menuItemVariants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  position: integer("position").notNull().default(0),
}, (t) => [index("menu_combo_items_combo_idx").on(t.comboId)]);
export type MenuComboItem = typeof menuComboItems.$inferSelect;

export const comboForm = z.object({
  name: z.string().trim().min(1, "Name your combo").max(80),
  description: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => v || null),
  price: z.coerce
    .number({ error: "Enter a valid price" })
    .positive("Set a combo price")
    .max(99999999.99, "Too large")
    .transform((n) => n.toFixed(2)),
  available: z.boolean().default(true),
  items: z
    .array(
      z.object({
        menuItemId: z.uuid(),
        variantId: z.uuid().nullable(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, "Pick what goes in the combo")
    .max(12, "Keep it to 12 items")
    // "2 pizzas for ₹499" is one item ×2 — count units, not rows.
    .refine((xs) => xs.reduce((n, x) => n + x.quantity, 0) >= 2, "A combo needs at least two things in it"),
});
export type ComboInput = z.infer<typeof comboForm>;
