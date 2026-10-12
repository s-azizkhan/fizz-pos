// Client-safe POS data shapes (prices as numbers, variants inlined).
import type { OrderSource } from "@/lib/db/schema/constants";

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

// Flat fees added on top of the taxed total.
export type OrderFees = {
  service: number;
  packaging: number;
  delivery: number;
};

export type OrderType = "dine_in" | "takeaway" | "delivery";
export type PaymentMethod = "cash" | "card" | "online";

// Store tax configuration surfaced to the POS.
export type TaxConfig = {
  rate: number; // percentage, e.g. 5 = 5%
  label: string; // GST / VAT / Sales Tax
  inclusive: boolean; // prices already include tax
};

// Store UPI configuration surfaced to the POS. Null when unset in settings.
export type UpiConfig = {
  vpa: string;
  name: string;
};

// An existing order loaded into the POS for editing (a revisited tab).
export type LoadedOrder = {
  id: string;
  number: string;
  type: OrderType;
  reference: string | null;
  // A guest's web order the kitchen hasn't seen yet — its first save sends
  // every line to the KOT, not just the additions.
  webPending: boolean;
  source: OrderSource;
  customer: { id: string; name: string | null; phone: string | null } | null;
  discount: number;
  fees: OrderFees;
  lines: CartLine[];
};
