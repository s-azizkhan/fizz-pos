import type { Metadata } from "next";
import { getStore } from "@/lib/store/data";
import { getFullMenu } from "@/lib/store/menu";
import PosTerminal from "@/components/fizz/pos/PosTerminal";
import type { PosCategory } from "@/components/fizz/pos/types";

export const metadata: Metadata = { title: "Till — Fizz" };

export default async function TillPage() {
  const [store, menu] = await Promise.all([getStore(), getFullMenu()]);

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

  return <PosTerminal categories={categories} currency={store.currency} />;
}
