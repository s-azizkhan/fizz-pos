import type { Metadata } from "next";
import { getStore } from "@/lib/store/data";
import { listCustomers } from "@/lib/store/customers";
import CustomersList from "@/components/fizz/customers/CustomersList";
import { requireFeature } from "@/lib/store/data";

export const metadata: Metadata = { title: "Customers — Fizz" };

// The store's customer book. Ships once; search filters on the device.
export default async function CustomersPage() {
  await requireFeature("customers");
  const [store, rows] = await Promise.all([getStore(), listCustomers()]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">Floor</p>
      <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        Customers
      </h1>
      <p className="mt-6 max-w-[60ch] text-lg text-steam">
        Every regular the POS has met — who they are, how often they come, what they spend.
      </p>

      <CustomersList
        currency={store.currency}
        rows={rows.map((c) => ({ ...c, lastOrderAt: c.lastOrderAt?.toISOString() ?? null }))}
      />
    </div>
  );
}
