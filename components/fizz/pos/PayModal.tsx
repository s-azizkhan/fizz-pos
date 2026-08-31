"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { upiPayLink } from "@/lib/store/format";
import UpiQr from "@/components/fizz/UpiQr";
import { FEE_FIELDS, feesTotal } from "./FeesModal";
import type { OrderFees, PaymentMethod, TaxConfig, UpiConfig } from "./types";

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
  fees,
  tax,
  upi,
  money,
  submitting,
  onPay,
  onClose,
}: {
  subtotal: number;
  fees: OrderFees;
  tax: TaxConfig;
  upi: UpiConfig | null;
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
  // Derived, not an effect: picking Online shows the QR straight away; the
  // toggle only records that the cashier deliberately collapsed it.
  const [qrCollapsed, setQrCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const tenderedRef = useRef<HTMLInputElement>(null);

  const r2 = (n: number) => Math.round(n * 100) / 100;
  const discount = Math.max(0, Math.min(Number(discountStr) || 0, subtotal));
  const net = r2(subtotal - discount);
  const rate = tax.rate / 100;
  // Mirror the server: inclusive tax is baked in; otherwise add on top.
  const taxAmount =
    rate > 0 ? (tax.inclusive ? r2(net - net / (1 + rate)) : r2(net * rate)) : 0;
  // Mirror the server: flat fees land on top of the taxed total, untaxed.
  const feeSum = feesTotal(fees);
  const total = r2((tax.inclusive ? net : r2(net + taxAmount)) + feeSum);
  const tendered = Number(tenderedStr) || 0;
  const change = method === "cash" ? Math.round((tendered - total) * 100) / 100 : 0;
  const cashShort = method === "cash" && tenderedStr !== "" && tendered < total;

  // Suggested cash amounts: exact, next round numbers above the total.
  const quickCash = useMemo(() => {
    const ups = [total, Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, Math.ceil(total / 20) * 20];
    return Array.from(new Set(ups.filter((v) => v >= total))).slice(0, 4);
  }, [total]);

  const upiLink = upi
    // UPI settles in INR only — the link currency is fixed, whatever the
    // store's display currency is.
    ? upiPayLink({ vpa: upi.vpa, name: upi.name, amount: total })
    : "";

  async function copyVpa() {
    if (!upi) return;
    try {
      await navigator.clipboard.writeText(upi.vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy — read it out instead.");
    }
  }

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
        if (k === "q" && upi) {
          setMethod("online");
          setQrCollapsed((v) => (method === "online" ? !v : false));
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, discount, tendered, tenderedStr, submitting, cashShort, upi]);

  const showQr = method === "online" && !!upi && !qrCollapsed;

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
        {/* Breakdown: subtotal, discount, tax */}
        <div className="mt-2 space-y-0.5 text-sm text-steam">
          {(discount > 0 || taxAmount > 0 || feeSum > 0) && (
            <p className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-cream">{money(subtotal)}</span>
            </p>
          )}
          {discount > 0 && (
            <p className="flex justify-between">
              <span>Discount</span>
              <span className="text-cream">− {money(discount)}</span>
            </p>
          )}
          {taxAmount > 0 && (
            <p className="flex justify-between">
              <span>
                {tax.label} ({tax.rate}%{tax.inclusive ? " incl." : ""})
              </span>
              <span className="text-cream">{money(taxAmount)}</span>
            </p>
          )}
          {FEE_FIELDS.filter((f) => fees[f.key] > 0).map((f) => (
            <p key={f.key} className="flex justify-between">
              <span>{f.label}</span>
              <span className="text-cream">{money(fees[f.key])}</span>
            </p>
          ))}
        </div>

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

        {/* Online / UPI */}
        {method === "online" && (
          upi ? (
            <div className="mt-4 overflow-hidden rounded-fizz border border-fizz/40 bg-fizz/5">
              <button
                onClick={() => setQrCollapsed((v) => !v)}
                aria-expanded={showQr}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-fizz/10"
              >
                <span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
                    Scan to pay
                  </span>
                  <span className="mt-0.5 block text-sm text-steam">
                    {upi.name} · {upi.vpa}
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-fizz/40 px-3 py-1 text-sm font-semibold text-fizz">
                  {showQr ? "Hide" : "Show QR"}
                  <kbd className="ml-1 text-[10px] opacity-60">Q</kbd>
                </span>
              </button>

              {showQr && (
                <div className="flex flex-col items-center gap-3 border-t border-fizz/20 px-4 py-5">
                  <UpiQr value={upiLink} size={196} />
                  <p className="font-display text-2xl font-bold text-fizz">
                    {money(total)}
                  </p>
                  <p className="text-center text-sm text-steam">
                    Amount is locked into the code — the customer just confirms.
                  </p>
                  <div className="flex w-full gap-2">
                    <button
                      onClick={copyVpa}
                      className="flex-1 rounded-fizz border border-ink-line bg-ink px-3 py-2 text-sm text-cream transition-colors hover:border-fizz hover:text-fizz"
                    >
                      {copied ? "Copied ●" : "Copy UPI ID"}
                    </button>
                    <a
                      href={upiLink}
                      className="flex-1 rounded-fizz border border-ink-line bg-ink px-3 py-2 text-center text-sm text-cream transition-colors hover:border-fizz hover:text-fizz"
                    >
                      Open in UPI app
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-fizz border border-ink-line bg-ink px-4 py-3 text-sm text-steam">
              Add a UPI ID in Store settings to show a scannable QR here.
            </p>
          )
        )}

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
