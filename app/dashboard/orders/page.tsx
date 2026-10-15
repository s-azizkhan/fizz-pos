import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { trpc } from "@/lib/trpc/server";
import { getOrderSettings, receiptStore } from "@/lib/store/order-settings";
import { currentMonth } from "@/lib/store/date-range";
import { featureOn } from "@/lib/store/features";
import OrdersClient from "@/components/fizz/orders/OrdersClient";

export const metadata: Metadata = { title: "Orders — Fizz" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "") ? monthParam! : currentMonth();
  const api = await trpc();
  const [user, store, first, header, ordering] = await Promise.all([
    getCurrentUser(),
    api.store.get(),
    api.orders.list({ month }),
    receiptStore(),
    getOrderSettings(),
  ]);

  return (
    <OrdersClient
      // Fresh state (older pages, filters) per month.
      key={month}
      isAdmin={user.role === "admin"}
      first={first}
      month={month}
      currency={store.currency}
      storeName={store.name}
      // Page-wide receipt bits, sent once rather than on every paid order.
      receiptHeader={header}
      taxLabel={store.taxLabel}
      storeWhatsapp={ordering.whatsapp}
      kot={featureOn(store.disabledFeatures, "kot")}
    />
  );
}
