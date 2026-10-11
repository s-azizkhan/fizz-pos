import type { OrderStatus, OrderPaymentMethod, OrderType } from "@/lib/db/schema";
import type { ReceiptData } from "@/lib/print/templates";

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
  reference: string | null;
  total: string;
  paymentMethod: OrderPaymentMethod | null;
  createdAt: string;
  paidAt: string | null;
  itemCount: number;
  items: OrderRowLine[];
  receipt: ReceiptData | null; // paid orders only, for reprints
};

export type StatusFilter = "open" | "paid" | "all";
