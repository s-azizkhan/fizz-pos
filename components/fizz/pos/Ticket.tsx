"use client";

import type { CartLine, OrderType } from "./types";

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "dine_in", label: "Dine in" },
  { value: "takeaway", label: "Takeaway" },
  { value: "delivery", label: "Delivery" },
];

// The running order ticket. Lines stack quantity; +/- adjusts, ✕ removes. The
// pay bar pins to the bottom with the live total and the F2 shortcut.
export default function Ticket({
  lines,
  subtotal,
  count,
  money,
  orderType,
  onOrderType,
  reference,
  onReference,
  onInc,
  onDec,
  onRemove,
  onClear,
  onPay,
}: {
  lines: CartLine[];
  subtotal: number;
  count: number;
  money: (n: number) => string;
  orderType: OrderType;
  onOrderType: (t: OrderType) => void;
  reference: string;
  onReference: (v: string) => void;
  onInc: (key: string) => void;
  onDec: (key: string) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  onPay: () => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col border-t border-ink-line bg-ink-soft/30 lg:border-t-0">
      {/* Order type + reference */}
      <div className="shrink-0 border-b border-ink-line p-4">
        <div className="grid grid-cols-3 gap-1.5">
          {ORDER_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => onOrderType(t.value)}
              className={`rounded-fizz border px-2 py-2 text-sm transition-colors ${
                orderType === t.value
                  ? "border-fizz bg-fizz text-ink"
                  : "border-ink-line bg-ink-soft text-cream hover:border-fizz"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={reference}
          onChange={(e) => onReference(e.target.value)}
          placeholder="Table / tab name (optional)"
          className="mt-2 w-full rounded-fizz border border-ink-line bg-ink-soft px-3 py-2 text-sm text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
        />
      </div>

      {/* Lines */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-steam">
            <p className="font-display text-lg text-cream">Empty ticket</p>
            <p className="mt-1 text-sm">Tap an item or start typing to add.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map((l) => (
              <li
                key={l.key}
                className="rounded-fizz border border-ink-line bg-ink-soft p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-cream">{l.name}</p>
                    {l.variantName && (
                      <p className="text-xs text-bubble">{l.variantName}</p>
                    )}
                    <p className="mt-0.5 text-xs text-steam">
                      {money(l.unitPrice)} each
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(l.key)}
                    aria-label="Remove line"
                    className="rounded-full border border-ink-line px-2 text-steam transition-colors hover:border-[#E2655A] hover:text-[#E2655A]"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDec(l.key)}
                      aria-label="Decrease"
                      className="h-8 w-8 rounded-fizz border border-ink-line text-cream transition-colors hover:border-fizz hover:text-fizz"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-display font-bold">
                      {l.quantity}
                    </span>
                    <button
                      onClick={() => onInc(l.key)}
                      aria-label="Increase"
                      className="h-8 w-8 rounded-fizz border border-ink-line text-cream transition-colors hover:border-fizz hover:text-fizz"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-display font-bold text-cream">
                    {money(l.unitPrice * l.quantity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pay bar */}
      <div className="shrink-0 border-t border-ink-line p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-steam">
              {count} item{count === 1 ? "" : "s"}
            </p>
            <p className="font-display text-3xl font-bold text-cream">
              {money(subtotal)}
            </p>
          </div>
          {lines.length > 0 && (
            <button
              onClick={onClear}
              className="rounded-fizz border border-ink-line px-3 py-2 text-sm text-steam transition-colors hover:border-[#E2655A] hover:text-[#E2655A]"
            >
              Clear
            </button>
          )}
        </div>
        <button
          onClick={onPay}
          disabled={lines.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-fizz bg-fizz px-6 py-4 font-display text-lg font-bold text-ink transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Charge {money(subtotal)}
          <kbd className="rounded bg-ink/20 px-1.5 py-0.5 text-xs font-semibold">
            F2
          </kbd>
        </button>
      </div>
    </aside>
  );
}
