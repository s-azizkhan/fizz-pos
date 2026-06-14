"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PaymentMethod } from "./types";

const METHODS: { value: PaymentMethod; label: string; key: string }[] = [
  { value: "cash", label: "Cash", key: "C" },
  { value: "card", label: "Card", key: "K" },
  { value: "online", label: "Online", key: "O" },
];

// Payment sheet. Pick a method, optional discount, and for cash key the amount
// tendered to auto-compute change. Quick-cash chips speed common notes. Enter
// confirms; Escape cancels.
export default function PayModal({
  subtotal,
  money,
  submitting,
  onPay,
  onClose,
}: {
  subtotal: number;
  money: (n: number) => string;
  submitting: boolean;
  onPay: (input: {
    paymentMethod: PaymentMethod;
    discount: number;
    tendered?: number;
  }) => Promise<string | void>;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [discountStr, setDiscountStr] = useState("");
  const [tenderedStr, setTenderedStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const tenderedRef = useRef<HTMLInputElement>(null);

  const discount = Math.max(0, Math.min(Number(discountStr) || 0, subtotal));
  const total = Math.round((subtotal - discount) * 100) / 100;
  const tendered = Number(tenderedStr) || 0;
  const change = method === "cash" ? Math.round((tendered - total) * 100) / 100 : 0;
  const cashShort = method === "cash" && tenderedStr !== "" && tendered < total;

  // Suggested cash amounts: exact, next round numbers above the total.
  const quickCash = useMemo(() => {
    const ups = [total, Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, Math.ceil(total / 20) * 20];
    return Array.from(new Set(ups.filter((v) => v >= total))).slice(0, 4);
  }, [total]);

  async function confirm() {
    if (submitting) return;
    if (cashShort) {
      setError("Cash tendered is less than the total.");
      return;
    }
    const res = await onPay({
      paymentMethod: method,
      discount,
      tendered: method === "cash" && tenderedStr !== "" ? tendered : undefined,
    });
    if (typeof res === "string") setError(res);
  }

  useEffect(() => {
    if (method === "cash") tenderedRef.current?.focus();
  }, [method]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        void confirm();
      }
      const k = e.key.toLowerCase();
      const target = e.target as HTMLElement;
      const inField = target.tagName === "INPUT";
      if (!inField) {
        if (k === "c") setMethod("cash");
        if (k === "k") setMethod("card");
        if (k === "o") setMethod("online");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, discount, tendered, tenderedStr, submitting, cashShort]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-fizz border border-ink-line bg-ink-soft p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Take payment
        </p>
        <p className="mt-2 font-display text-4xl font-bold text-cream">
          {money(total)}
        </p>
        {discount > 0 && (
          <p className="mt-1 text-sm text-steam">
            {money(subtotal)} − {money(discount)} discount
          </p>
        )}

        {/* Method */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMethod(m.value)}
              className={`rounded-fizz border px-2 py-3 text-sm transition-colors ${
                method === m.value
                  ? "border-fizz bg-fizz text-ink"
                  : "border-ink-line bg-ink text-cream hover:border-fizz"
              }`}
            >
              {m.label}
              <kbd className="ml-1 text-[10px] opacity-60">{m.key}</kbd>
            </button>
          ))}
        </div>

        {/* Discount */}
        <label className="mt-4 block">
          <span className="text-xs uppercase tracking-[0.18em] text-steam">
            Discount
          </span>
          <input
            inputMode="decimal"
            value={discountStr}
            onChange={(e) => setDiscountStr(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            className="mt-1 w-full rounded-fizz border border-ink-line bg-ink px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
          />
        </label>

        {/* Cash flow */}
        {method === "cash" && (
          <div className="mt-4">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.18em] text-steam">
                Cash tendered
              </span>
              <input
                ref={tenderedRef}
                inputMode="decimal"
                value={tenderedStr}
                onChange={(e) =>
                  setTenderedStr(e.target.value.replace(/[^0-9.]/g, ""))
                }
                placeholder={total.toFixed(2)}
                className="mt-1 w-full rounded-fizz border border-ink-line bg-ink px-4 py-3 font-display text-lg text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {quickCash.map((v) => (
                <button
                  key={v}
                  onClick={() => setTenderedStr(v.toFixed(2))}
                  className="rounded-full border border-ink-line bg-ink px-3 py-1 text-sm text-cream transition-colors hover:border-fizz hover:text-fizz"
                >
                  {money(v)}
                </button>
              ))}
            </div>
            {tenderedStr !== "" && (
              <p
                className={`mt-3 font-display text-lg font-bold ${
                  cashShort ? "text-[#E2655A]" : "text-bubble"
                }`}
              >
                {cashShort
                  ? `Short ${money(total - tendered)}`
                  : `Change ${money(change)}`}
              </p>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-[#E2655A]">{error}</p>}

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-fizz border border-ink-line bg-ink px-4 py-3 text-cream transition-colors hover:border-fizz"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={submitting || cashShort}
            className="flex-[2] rounded-fizz bg-fizz px-4 py-3 font-display font-bold text-ink transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Ringing…" : "Confirm payment"}
            <kbd className="ml-2 rounded bg-ink/20 px-1.5 py-0.5 text-xs">↵</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
