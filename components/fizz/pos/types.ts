// Client-safe POS data shapes (prices as numbers, variants inlined).

export type PosVariant = {
  id: string;
  name: string;
  price: number;
};

export type PosItem = {
  id: string;
  name: string;
  price: number;
  variants: PosVariant[];
};

export type PosCategory = {
  id: string;
  name: string;
  icon: string;
  items: PosItem[];
};

// A line in the cart. `key` uniquely identifies an item+variant combo so
// repeat taps stack quantity instead of duplicating rows.
export type CartLine = {
  key: string;
  menuItemId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
};

export type OrderType = "dine_in" | "takeaway" | "delivery";
export type PaymentMethod = "cash" | "card" | "online";

// An existing order loaded into the till for editing (a revisited tab).
export type LoadedOrder = {
  id: string;
  number: string;
  type: OrderType;
  reference: string | null;
  discount: number;
  lines: CartLine[];
};
