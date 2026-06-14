import type { OrderStatus, OrderPaymentMethod, OrderType } from "@/lib/db/schema";

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
};

export type StatusFilter = "open" | "paid" | "all";
