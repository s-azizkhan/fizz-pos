"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateTime, formatMoney } from "@/lib/store/format";
import { matchCustomer } from "@/lib/store/customer-match";

type Row = {
  id: string;
  name: string | null;
  phone: string | null;
  orderCount: number;
  spent: string;
  lastOrderAt: string | null;
};

// Rows painted at once — keeps a cheap tablet snappy; search narrows the rest.
const SHOWN = 100;

// Customer book with instant, on-device search by name or phone.
export default function CustomersList({ rows, currency }: { rows: Row[]; currency: string }) {
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const hits = useMemo(() => rows.filter((c) => matchCustomer(c, dq)), [rows, dq]);

  return (
    <>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or phone"
        autoComplete="off"
        className="mt-10 w-full max-w-md rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
      />

      <p className="mt-6 text-sm text-steam">
        {hits.length} {hits.length === 1 ? "customer" : "customers"}
        {q.trim() && <> matching “{q.trim()}”</>}
        {hits.length > SHOWN && <> · showing {SHOWN}, search to narrow</>}
      </p>

      {hits.length === 0 ? (
        <div className="mt-4 rounded-fizz border border-ink-line bg-ink-soft p-7 text-center">
          <p className="font-display text-xl font-bold text-cream">
            {q.trim() ? "No one by that name or number" : "No customers yet"}
          </p>
          <p className="mt-1 text-sm text-steam">
            Add a name or phone to an order at the POS — they land here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-ink-line overflow-hidden rounded-fizz border border-ink-line bg-ink-soft">
          {hits.slice(0, SHOWN).map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/customers/${c.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-fizz/5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-cream">{c.name || "No name"}</p>
                  <p className="font-display text-sm text-steam">{c.phone || "No phone"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display font-bold text-cream">{formatMoney(c.spent, currency)}</p>
                  <p className="text-xs text-steam">
                    {c.orderCount} {c.orderCount === 1 ? "order" : "orders"}
                    {c.lastOrderAt && <> · last {formatDateTime(c.lastOrderAt)}</>}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
