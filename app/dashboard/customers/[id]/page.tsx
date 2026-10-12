import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getStore } from "@/lib/store/data";
import { customerOrders, getCustomer } from "@/lib/store/customers";
import { formatDateTime, formatMoney } from "@/lib/store/format";

export const metadata: Metadata = { title: "Customer — Fizz" };

const TYPE_LABEL: Record<string, string> = {
  dine_in: "Dine in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

// One customer and every order linked to them, newest first.
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [store, customer, history] = await Promise.all([
    getStore(),
    getCustomer(id),
    customerOrders(id),
  ]);
  if (!customer) notFound();

  const money = (n: string | number) => formatMoney(n, store.currency);
  const paid = history.filter((o) => o.status === "paid");
  const spent = paid.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 lg:py-14">
      <Link
        href="/dashboard/customers"
        className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz hover:underline"
      >
        ← Customers
      </Link>
      <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        {customer.name || "No name"}
      </h1>
      <p className="mt-1 font-display text-lg text-steam">{customer.phone || "No phone"}</p>

      <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-xl">
        {[
          ["Orders", String(history.filter((o) => o.status !== "void").length)],
          ["Spent", money(spent.toFixed(2))],
          ["Avg order", paid.length ? money((spent / paid.length).toFixed(2)) : "—"],
        ].map(([label, v]) => (
          <div key={label} className="rounded-fizz border border-ink-line bg-ink-soft p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-steam">{label}</p>
            <p className="mt-1 font-display text-xl font-bold text-cream">{v}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-xl font-bold tracking-tight">Order history</h2>
      {history.length === 0 ? (
        <p className="mt-4 text-steam">No orders linked yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {history.map((o) => (
            <li key={o.id} className="rounded-fizz border border-ink-line bg-ink-soft p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold text-cream">{o.number}</p>
                  <p className="text-xs text-steam">
                    {formatDateTime(o.paidAt ?? o.createdAt)} · {TYPE_LABEL[o.type]}
                    {o.reference ? ` · ${o.reference}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      o.status === "open"
                        ? "border-fizz bg-fizz/15 text-fizz"
                        : "border-ink-line bg-ink text-steam"
                    }`}
                  >
                    {o.status === "open" ? "Open" : o.status === "paid" ? "Paid" : "Void"}
                  </span>
                  <span className={`font-display font-bold ${o.status === "void" ? "text-steam line-through" : "text-cream"}`}>
                    {money(o.total)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-steam">
                {o.items.map((it) => `${it.quantity}× ${it.name}${it.variantName ? ` (${it.variantName})` : ""}`).join(", ")}
              </p>
              {o.status === "open" && (
                <Link
                  href={`/dashboard/pos?order=${o.id}`}
                  className="mt-3 inline-block text-sm font-semibold text-fizz hover:underline"
                >
                  Open tab in POS →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
