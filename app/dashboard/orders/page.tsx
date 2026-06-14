import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import { listOrders } from "@/lib/store/orders";
import OrdersClient from "@/components/fizz/orders/OrdersClient";
import type { OrderRow } from "@/components/fizz/orders/types";

export const metadata: Metadata = { title: "Orders — Fizz" };

export default async function OrdersPage() {
  await getCurrentUser();
  const [store, all] = await Promise.all([getStore(), listOrders()]);

  // Serialise to a client-safe row shape.
  const orders: OrderRow[] = all.map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    type: o.type,
    reference: o.reference,
    total: o.total,
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    itemCount: o.items.reduce((s, it) => s + it.quantity, 0),
    items: o.items.map((it) => ({
      name: it.name,
      variantName: it.variantName,
      quantity: it.quantity,
      lineTotal: it.lineTotal,
    })),
  }));

  return <OrdersClient orders={orders} currency={store.currency} />;
}
