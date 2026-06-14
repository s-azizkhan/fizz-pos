import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import { listInventory, inventorySummary } from "@/lib/store/inventory";
import { formatMoney } from "@/lib/store/format";
import InventoryManager from "@/components/fizz/inventory/InventoryManager";

export const metadata: Metadata = { title: "Inventory — Fizz" };

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (user.role === "staff") redirect("/dashboard");

  const [store, rows] = await Promise.all([getStore(), listInventory()]);
  const summary = await inventorySummary(rows);
  const canEdit = user.role === "admin" || user.role === "manager";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        Stock
      </p>
      <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        Inventory
      </h1>
      <p className="mt-3 max-w-[60ch] text-lg text-steam">
        Track every ingredient and supply, live. Record deliveries, waste, and
        recounts, and catch low stock before you run out.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-fizz border border-ink-line bg-ink-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">Items tracked</p>
          <p className="mt-2 font-display text-3xl font-bold">{summary.count}</p>
        </div>
        <div className="rounded-fizz border border-ink-line bg-ink-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">Low stock</p>
          <p className={`mt-2 font-display text-3xl font-bold ${summary.lowCount > 0 ? "text-[#E2655A]" : ""}`}>
            {summary.lowCount}
          </p>
        </div>
        <div className="rounded-fizz border border-ink-line bg-ink-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">Stock value</p>
          <p className="mt-2 font-display text-3xl font-bold text-fizz">
            {formatMoney(summary.totalValue, store.currency)}
          </p>
        </div>
      </div>

      <div className="mt-10">
        <InventoryManager rows={rows} currency={store.currency} canEdit={canEdit} />
      </div>
    </div>
  );
}
