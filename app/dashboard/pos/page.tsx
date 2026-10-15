import type { Metadata } from "next";
import { trpc } from "@/lib/trpc/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCustomer } from "@/lib/store/customers";
import { toLoadedOrder } from "@/lib/store/orders";
import { getOrderSettings } from "@/lib/store/order-settings";
import { featureOn } from "@/lib/store/features";
import PosTerminal from "@/components/fizz/pos/PosTerminal";
import type { LoadedOrder, PosCategory } from "@/components/fizz/pos/types";

export const metadata: Metadata = { title: "POS — Fizz" };

export default async function TillPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const api = await trpc();
  const { order: orderId } = await searchParams;
  const [user, store, menu, order, ordering] = await Promise.all([
    getCurrentUser(),
    api.store.get(),
    api.menu.full(),
    orderId ? api.orders.byId(orderId) : Promise.resolve(null),
    getOrderSettings(),
  ]);

  // Flatten to a client-safe shape: only available categories/items, prices as
  // numbers, variants inlined. Keeps the terminal lean and serialisable.
  const categories: PosCategory[] = menu
    .filter((c) => c.available)
    .map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      items: c.items
        .filter((it) => it.available)
        .map((it) => ({
          id: it.id,
          name: it.name,
          price: Number(it.price),
          variants: it.variants.map((v) => ({
            id: v.id,
            name: v.name,
            price: Number(v.price),
          })),
        })),
    }))
    .filter((c) => c.items.length > 0);

  // Hydrate an existing OPEN tab into the cart when ?order= is passed and the
  // order is still editable. Paid/void orders are read-only, except for admins.
  const loaded: LoadedOrder | null =
    order && (order.status === "open" || user.role === "admin")
      ? toLoadedOrder(order, order.customerId ? await getCustomer(order.customerId) : null)
      : null;

  return (
    <PosTerminal
      categories={categories}
      storeName={store.name}
      currency={store.currency}
      tax={{
        rate: Number(store.taxRate),
        label: store.taxLabel,
        inclusive: store.taxInclusive,
      }}
      upi={
        store.upiId
          ? { vpa: store.upiId, name: store.upiName || store.name }
          : null
      }
      storeWhatsapp={ordering.whatsapp}
      customers={featureOn(store.disabledFeatures, "customers")}
      loaded={loaded}
      requestedOrderId={orderId ?? null}
    />
  );
}
