import type { OrderStatus, OrderPaymentMethod, OrderType } from "@/lib/db/schema";
import type { LoadedOrder } from "@/components/fizz/pos/types";
import type { OrderSource } from "@/lib/db/schema/constants";

export type OrderRowLine = {
  name: string;
  variantName: string | null;
  quantity: number;
  lineTotal: string;
};

// Client-safe order summary for the orders page.
export type OrderRow = {
  id: string;
  number: string;
  status: OrderStatus;
  type: OrderType;
  source: OrderSource;
  reference: string | null;
  total: string;
  paymentMethod: OrderPaymentMethod | null;
  createdAt: string;
  paidAt: string | null;
  itemCount: number;
  items: OrderRowLine[];
  // Linked customer, for "Share on WhatsApp".
  customer: { name: string | null; phone: string | null } | null;
  // Paid orders only: the money a reprinted receipt needs beyond the lines.
  bill: {
    subtotal: string;
    discount: string;
    tax: string;
    fees: { service: string; packaging: string; delivery: string };
    changeDue: string | null;
  } | null;
  // Open tabs only: everything the POS needs to edit/settle it from the device.
  tab: LoadedOrder | null;
};

export type StatusFilter = "open" | "paid" | "void" | "all";
