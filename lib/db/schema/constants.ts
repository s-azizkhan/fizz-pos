// Client-safe constants shared by the schema and the UI. NO drizzle / zod
// imports here: 'use client' components import this file directly, and
// pulling them in through the schema barrel would ship drizzle + zod (~87KB gz)
// to the browser. The pgEnums in the table files are built from these arrays.

// Units an inventory item is measured in. First value is the column default.
export const INVENTORY_UNITS = ["each", "g", "kg", "ml", "l", "pack", "box", "bag"] as const;
export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

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

// Why a stock level changed. `receive` adds, `waste`/`sale` remove, `adjust`
// sets an absolute count (a manual recount).
export const STOCK_MOVEMENT_TYPES = ["receive", "waste", "sale", "adjust"] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  receive: "Received",
  waste: "Waste / loss",
  sale: "Used / sold",
  adjust: "Recount",
};

// How an expense was paid. First value is the column default.
export const EXPENSE_METHODS = ["cash", "online", "credit", "other"] as const;
export type ExpenseMethod = (typeof EXPENSE_METHODS)[number];

// Spend categories for the café floor. Keep broad — descriptions add detail.
export const EXPENSE_CATEGORIES = [
  "Inventory",
  "Supplies",
  "Rent",
  "Utilities",
  "Payroll",
  "Marketing",
  "Maintenance",
  "Equipment",
  "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Curated emoji suggestions surfaced in the picker. NOT a constraint — any
// emoji (or short symbol) is accepted; this list is just a quick-pick palette.
export const MENU_ICON_SUGGESTIONS = [
  "☕", "🍵", "🧋", "🥤", "🧊", "🍶", "🍷", "🍺", "🥂", "🍹",
  "🥐", "🍞", "🥖", "🧁", "🍰", "🎂", "🍪", "🍩", "🥧", "🍫",
  "🥪", "🍔", "🌮", "🌯", "🥗", "🍕", "🍝", "🍜", "🍳", "🥞",
  "🧇", "🥯", "🥓", "🧀", "🍦", "🍨", "🍧", "🍓", "🍎", "🥑",
  "🌿", "🔥", "⭐", "✨", "💧", "🌅", "🥥", "🍯", "🧂", "🍴",
] as const;

// Public menu page text sizes. Constrained to keep the public renderer simple.
export const MENU_FONT_SCALES = ["sm", "md", "lg"] as const;
export type MenuFontScale = (typeof MENU_FONT_SCALES)[number];
