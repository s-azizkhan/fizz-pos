import { boolean, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./user";
import { store } from "./store";

// A menu category (e.g. "Hot Coffee", "Pastries"). Ordered by `position`,
// each carries an icon key resolved client-side. Soft-deleted via deletedAt.
export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id")
    .notNull()
    .default(1)
    .references(() => store.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("cup"),
  position: integer("position").notNull().default(0),
  enteredBy: integer("entered_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});
export type MenuCategory = typeof menuCategories.$inferSelect;

// A menu item belonging to a category. Base price; variants override it.
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => menuCategories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  available: boolean("available").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});
export type MenuItem = typeof menuItems.$inferSelect;

// A variant of an item (e.g. "Small", "Large"). Has its own price.
export const menuItemVariants = pgTable("menu_item_variants", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type MenuItemVariant = typeof menuItemVariants.$inferSelect;

// Icons a category can use. Keys map to inline SVGs in the menu icon set.
export const MENU_CATEGORY_ICONS = [
  "cup",
  "coffee",
  "tea",
  "cold",
  "pastry",
  "cake",
  "sandwich",
  "salad",
  "breakfast",
  "bottle",
  "wine",
  "star",
  "leaf",
  "fire",
] as const;
export type MenuCategoryIcon = (typeof MENU_CATEGORY_ICONS)[number];

const money = z
  .coerce.number({ error: "Enter a valid price" })
  .min(0, "Cannot be negative")
  .max(99999999.99, "Too large")
  .transform((n) => n.toFixed(2));

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || null);

export const categoryForm = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  icon: z.enum(MENU_CATEGORY_ICONS, "Pick an icon"),
});
export type CategoryInput = z.infer<typeof categoryForm>;

// A variant row inside the item form payload.
const variantSchema = z.object({
  name: z.string().trim().min(1, "Variant name required").max(60),
  price: money,
});

export const itemForm = z.object({
  categoryId: z.coerce.number().int().positive("Pick a category"),
  name: z.string().trim().min(1, "Name is required").max(120),
  description: optionalText(280),
  price: money,
  available: z.coerce.boolean().default(true),
  // Variants arrive as a JSON string from the client form.
  variants: z
    .string()
    .optional()
    .transform((s) => {
      if (!s) return [] as z.infer<typeof variantSchema>[];
      try {
        return z.array(variantSchema).parse(JSON.parse(s));
      } catch {
        return [] as z.infer<typeof variantSchema>[];
      }
    }),
});
export type ItemInput = z.infer<typeof itemForm>;
