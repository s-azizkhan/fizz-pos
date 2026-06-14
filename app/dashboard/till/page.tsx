import type { Metadata } from "next";
import { getStore } from "@/lib/store/data";
import { getFullMenu } from "@/lib/store/menu";
import { getOrder } from "@/lib/store/orders";
import PosTerminal from "@/components/fizz/pos/PosTerminal";
import type { LoadedOrder, PosCategory } from "@/components/fizz/pos/types";

export const metadata: Metadata = { title: "Till — Fizz" };

export default async function TillPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const [store, menu, order] = await Promise.all([
    getStore(),
    getFullMenu(),
    orderId ? getOrder(orderId) : Promise.resolve(null),
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
  // order is still editable. Paid/void orders are ignored (read-only history).
  const loaded: LoadedOrder | null =
    order && order.status === "open"
      ? {
          id: order.id,
          number: order.number,
          type: order.type,
          reference: order.reference,
          discount: Number(order.discount),
          lines: order.items.map((it) => ({
            key: it.variantId ? `${it.menuItemId}:${it.variantId}` : it.menuItemId ?? it.id,
            menuItemId: it.menuItemId ?? "",
            variantId: it.variantId,
            name: it.name,
            variantName: it.variantName,
            unitPrice: Number(it.unitPrice),
            quantity: it.quantity,
          })),
        }
      : null;

  return (
    <PosTerminal
      categories={categories}
      currency={store.currency}
      loaded={loaded}
    />
  );
}
