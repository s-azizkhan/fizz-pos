"use client";

import { useEffect } from "react";

type KotItem = {
  name: string;
  variantName: string | null;
  quantity: number;
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Kitchen Order Ticket. Renders on a white slip (thermal-printer friendly),
// big and high-contrast so cooks can read it across the pass. The "Print"
// button calls window.print(); a print stylesheet hides the app chrome.
export default function KotTicket({
  storeName,
  orderNumber,
  type,
  reference,
  status,
  createdAt,
  items,
}: {
  storeName: string;
  orderNumber: string;
  type: string;
  reference: string | null;
  status: string;
  createdAt: string;
  items: KotItem[];
}) {
  // Hide the dashboard chrome while this page is shown and restore on leave.
  useEffect(() => {
    document.body.classList.add("kot-print");
    return () => document.body.classList.remove("kot-print");
  }, []);

  return (
    <div className="kot-root mx-auto max-w-sm p-4">
      {/* On-screen controls (hidden when printing) */}
      <div className="kot-actions mb-4 flex items-center justify-between gap-2">
        <a
          href="/dashboard/orders"
          className="rounded-fizz border border-ink-line bg-ink-soft px-4 py-2 text-sm text-cream transition-colors hover:border-fizz hover:text-fizz"
        >
          ← Orders
        </a>
        <button
          onClick={() => window.print()}
          className="rounded-fizz bg-fizz px-5 py-2 font-semibold text-ink transition-transform hover:scale-105"
        >
          Print KOT
        </button>
      </div>

      {/* The slip itself */}
      <div className="kot-slip rounded-fizz border border-ink-line bg-white p-5 text-black">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-black/60">
            {storeName}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">KOT</h1>
        </div>

        <div className="mt-4 border-y-2 border-dashed border-black/40 py-2 text-center">
          <p className="text-3xl font-extrabold tracking-tight">{type}</p>
          {reference && (
            <p className="mt-1 text-lg font-bold">Table / Tab: {reference}</p>
          )}
        </div>

        <div className="mt-3 flex justify-between text-sm">
          <span className="font-semibold">{orderNumber}</span>
          <span>{fmtTime(createdAt)}</span>
        </div>
        {status !== "open" && (
          <p className="mt-1 text-center text-xs uppercase tracking-wider text-black/60">
            {status === "paid" ? "(reprint — paid)" : `(${status})`}
          </p>
        )}

        <ul className="mt-4 divide-y divide-dashed divide-black/30">
          {items.map((it, i) => (
            <li key={i} className="flex items-baseline gap-3 py-2">
              <span className="min-w-[2.5rem] text-2xl font-extrabold tabular-nums">
                {it.quantity}×
              </span>
              <span className="text-lg font-semibold leading-tight">
                {it.name}
                {it.variantName && (
                  <span className="block text-sm font-medium text-black/70">
                    {it.variantName}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 border-t-2 border-dashed border-black/40 pt-2 text-center text-sm font-semibold">
          {items.reduce((s, it) => s + it.quantity, 0)} item
          {items.reduce((s, it) => s + it.quantity, 0) === 1 ? "" : "s"} total
        </p>
      </div>

      {/* Print styles: show only the slip, plain white page. */}
      <style jsx global>{`
        @media print {
          body.kot-print * {
            visibility: hidden;
          }
          body.kot-print .kot-slip,
          body.kot-print .kot-slip * {
            visibility: visible;
          }
          body.kot-print .kot-actions {
            display: none !important;
          }
          body.kot-print .kot-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
}
