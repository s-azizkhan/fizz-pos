import { index, numeric, pgTable, uuid, unique } from "drizzle-orm/pg-core";
import { z } from "zod";
import { menuItems, menuItemVariants } from "./menu";
import { inventoryItems } from "./inventory";

// A recipe component: how much of one inventory item is consumed to make one
// unit of a menu item (or a specific variant of it). The sum of components is
// the bill of materials that the till deducts from stock on every paid sale.
//
// `variantId` null = the item's base recipe (used when no variant is sold, or
// as the fallback when a sold variant has no recipe of its own). A non-null
// `variantId` overrides the base for that variant only — mirroring how
// variant.cost overrides item.cost elsewhere in the menu schema.
export const recipeComponents = pgTable(
  "recipe_components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => menuItemVariants.id, {
      onDelete: "cascade",
    }),
    inventoryItemId: uuid("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    // Amount of the inventory item used per single unit sold, in that item's
    // own unit (g, ml, each…). numeric(14,3) string to avoid float drift.
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  },
  (t) => [
    // Resolution at checkout loads every component for the sold menu items.
    index("recipe_components_menu_item_idx").on(t.menuItemId),
    // "Where is this ingredient used" / cascade hygiene.
    index("recipe_components_inventory_item_idx").on(t.inventoryItemId),
    // One row per (item, variant, ingredient). variantId null collapses to the
    // base recipe; NULLs are distinct in Postgres uniqueness, which is exactly
    // what we want — a base row and a variant row can name the same ingredient.
    unique("recipe_components_unique").on(
      t.menuItemId,
      t.variantId,
      t.inventoryItemId,
    ),
  ],
);
export type RecipeComponent = typeof recipeComponents.$inferSelect;

// ---- Validation ---------------------------------------------------------

const qty = z
  .coerce.number({ error: "Enter a valid number" })
  .gt(0, "Must be greater than zero")
  .max(99999999.999, "Too large")
  .transform((n) => n.toFixed(3));

// One component row in the recipe editor payload.
const componentSchema = z.object({
  inventoryItemId: z.uuid("Pick an ingredient"),
  quantity: qty,
});

// Save the full recipe for a menu item (and optionally a specific variant) in
// one shot — the editor replaces all rows for that (item, variant) scope.
export const recipeForm = z.object({
  menuItemId: z.uuid("Unknown item"),
  // Empty / missing = the item's base recipe.
  variantId: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  // Components arrive as a JSON string from the client form.
  components: z
    .string()
    .optional()
    .transform((s) => {
      if (!s) return [] as z.infer<typeof componentSchema>[];
      try {
        return z.array(componentSchema).parse(JSON.parse(s));
      } catch {
        return [] as z.infer<typeof componentSchema>[];
      }
    }),
});
export type RecipeInput = z.infer<typeof recipeForm>;
