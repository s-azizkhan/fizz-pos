"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/store/format";
import { voidOrder } from "@/app/actions/order";
import { Chip, ChipBar } from "@/components/fizz/ui/controls";
import type { OrderRow, StatusFilter } from "./types";

const TYPE_LABEL: Record<string, string> = {
  dine_in: "Dine in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};
const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  online: "Online",
};

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Open tabs" },
  { value: "paid", label: "Paid" },
  { value: "all", label: "All" },
];

// Orders dashboard: filter by open/paid, revisit an open tab to edit in the
// till, settle it, or void it. Paid orders are read-only receipts.
export default function OrdersClient({
  orders,
  currency,
}: {
  orders: OrderRow[];
  currency: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const money = (n: string) => formatMoney(n, currency);

  const counts = useMemo(
    () => ({
      open: orders.filter((o) => o.status === "open").length,
      paid: orders.filter((o) => o.status === "paid").length,
    }),
    [orders],
  );

  const shown = useMemo(
    () =>
      orders.filter((o) =>
        filter === "all" ? o.status !== "void" : o.status === filter,
      ),
    [orders, filter],
  );

  const openTotal = useMemo(
    () =>
      orders
        .filter((o) => o.status === "open")
        .reduce((s, o) => s + Number(o.total), 0),
    [orders],
  );

  function edit(id: string) {
    router.push(`/dashboard/till?order=${id}`);
  }

  function settle(id: string) {
    // Reuse the till's pay flow — opening the tab there gives the full sheet.
    router.push(`/dashboard/till?order=${id}`);
  }

  function doVoid(id: string) {
    if (!confirm("Void this open tab? This cannot be undone.")) return;
    setBusyId(id);
    startTransition(async () => {
      await voidOrder(id);
      setBusyId(null);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Point of sale
          </p>
          <h1 className="mt-2 font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
            Orders
          </h1>
          <p className="mt-1 text-steam">
            Revisit open tabs to add dishes or settle. Browse paid history.
          </p>
        </div>
        <a
          href="/dashboard/till"
          className="rounded-fizz bg-fizz px-5 py-3 font-semibold text-ink transition-transform hover:scale-105"
        >
          + New order
        </a>
      </div>

      {/* Open tabs summary */}
      {counts.open > 0 && (
        <div className="mt-6 inline-flex items-center gap-3 rounded-fizz border border-fizz/40 bg-fizz/10 px-4 py-2 text-sm">
          <span className="font-semibold text-fizz">{counts.open} open tab{counts.open === 1 ? "" : "s"}</span>
          <span className="text-steam">·</span>
          <span className="font-display font-bold text-cream">
            {money(openTotal.toFixed(2))} outstanding
          </span>
        </div>
      )}

      {/* Filters */}
      <ChipBar className="mt-6">
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            active={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            {f.value === "open" && counts.open > 0 && (
              <span className="rounded-full bg-fizz/15 px-1.5 text-xs">
                {counts.open}
              </span>
            )}
          </Chip>
        ))}
      </ChipBar>

      {/* Order cards */}
      {shown.length === 0 ? (
        <div className="mt-10 flex min-h-[30vh] items-center justify-center rounded-fizz border border-dashed border-ink-line bg-ink-soft/40">
          <div className="text-center">
            <p className="font-display text-xl font-bold text-cream">
              {filter === "open" ? "No open tabs" : "Nothing here yet"}
            </p>
            <p className="mt-1 text-sm text-steam">
              {filter === "open"
                ? "Saved dine-in tabs will appear here."
                : "Settled orders will show up as you ring them."}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((o) => (
            <article
              key={o.id}
              className="flex flex-col rounded-fizz border border-ink-line bg-ink-soft p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-bold text-cream">
                    {o.number}
                  </p>
                  <p className="text-xs text-steam">
                    {TYPE_LABEL[o.type]}
                    {o.reference ? ` · ${o.reference}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    o.status === "open"
                      ? "border-fizz bg-fizz/15 text-fizz"
                      : "border-ink-line bg-ink text-steam"
                  }`}
                >
                  {o.status === "open" ? "Open" : "Paid"}
                </span>
              </div>

              {/* Lines preview */}
              <ul className="mt-3 flex-1 space-y-1 text-sm">
                {o.items.slice(0, 4).map((it, i) => (
                  <li key={i} className="flex justify-between gap-2 text-cream">
                    <span className="truncate">
                      <span className="text-steam">{it.quantity}×</span> {it.name}
                      {it.variantName ? (
                        <span className="text-bubble"> · {it.variantName}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-steam">{money(it.lineTotal)}</span>
                  </li>
                ))}
                {o.items.length > 4 && (
                  <li className="text-xs text-steam">
                    +{o.items.length - 4} more
                  </li>
                )}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-ink-line pt-3">
                <span className="text-xs text-steam">
                  {o.status === "paid" && o.paymentMethod
                    ? METHOD_LABEL[o.paymentMethod]
                    : `${o.itemCount} item${o.itemCount === 1 ? "" : "s"}`}
                </span>
                <span className="font-display text-xl font-bold text-cream">
                  {money(o.total)}
                </span>
              </div>

              {/* Actions */}
              {o.status === "open" && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => edit(o.id)}
                    className="flex-1 rounded-fizz border border-ink-line bg-ink px-3 py-2.5 text-sm font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => settle(o.id)}
                    className="flex-1 rounded-fizz bg-fizz px-3 py-2.5 text-sm font-bold text-ink transition-transform hover:scale-[1.02]"
                  >
                    Settle
                  </button>
                  <button
                    onClick={() => doVoid(o.id)}
                    disabled={pending && busyId === o.id}
                    aria-label="Void tab"
                    className="rounded-fizz border border-ink-line px-3 text-steam transition-colors hover:border-[#E2655A] hover:text-[#E2655A] disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Kitchen ticket — print/reprint for any order */}
              <a
                href={`/dashboard/orders/${o.id}/kot`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block rounded-fizz border border-ink-line px-3 py-2 text-center text-sm font-semibold text-steam transition-colors hover:border-fizz hover:text-fizz"
              >
                🧾 {o.status === "open" ? "Print KOT" : "Reprint KOT"}
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
