import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { trpc } from "@/lib/trpc/server";
import { receiptStore } from "@/lib/store/order-settings";
import { currentMonth } from "@/lib/store/date-range";
import OrdersClient from "@/components/fizz/orders/OrdersClient";
import type { OrderRow } from "@/components/fizz/orders/types";

export const metadata: Metadata = { title: "Orders — Fizz" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "") ? monthParam! : currentMonth();
  const api = await trpc();
  const user = await getCurrentUser();
  const [store, all, header] = await Promise.all([
    api.store.get(),
    api.orders.list({ month }),
    receiptStore(),
  ]);

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
    // Same shape checkout returns, rebuilt from the stored snapshot.
    receipt:
      o.status === "paid"
        ? {
            store: header,
            currency: store.currency,
            orderNumber: o.number,
            createdAt: (o.paidAt ?? o.createdAt).toISOString(),
            type: o.type,
            reference: o.reference,
            lines: o.items.map((it) => ({
              name: it.name,
              variantName: it.variantName,
              quantity: it.quantity,
              lineTotal: it.lineTotal,
            })),
            subtotal: o.subtotal,
            discount: o.discount,
            tax: o.tax,
            taxLabel: store.taxLabel,
            fees: { service: o.serviceFee, packaging: o.packagingFee, delivery: o.deliveryFee },
            total: o.total,
            paymentMethod: o.paymentMethod,
            changeDue: o.changeDue,
          }
        : null,
  }));

  return <OrdersClient isAdmin={user.role === "admin"} orders={orders} month={month} currency={store.currency} storeName={store.name} />;
}
