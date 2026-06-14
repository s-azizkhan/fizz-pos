"use client";

import { useEffect } from "react";

// Success confirmation after a sale. Shows the order number and, for cash, the
// change owed in big type. Enter / Escape / click dismisses to start the next.
export default function ReceiptModal({
  orderNumber,
  subtotal,
  discount,
  tax,
  taxLabel,
  total,
  changeDue,
  onClose,
}: {
  orderNumber: string;
  subtotal: string;
  discount: string | null;
  tax: string | null;
  taxLabel: string;
  total: string;
  changeDue: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === "Escape" || e.key === " ") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-fizz border border-ink-line bg-ink-soft p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-fizz font-display text-2xl font-bold text-ink">
          ✓
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
          Paid
        </p>
        <p className="mt-1 font-display text-3xl font-bold text-cream">{total}</p>
        <p className="mt-1 text-sm text-steam">Order {orderNumber}</p>

        {/* Bill breakdown */}
        {(discount || tax) && (
          <div className="mt-4 space-y-1 rounded-fizz border border-ink-line bg-ink p-4 text-left text-sm">
            <p className="flex justify-between text-steam">
              <span>Subtotal</span>
              <span className="text-cream">{subtotal}</span>
            </p>
            {discount && (
              <p className="flex justify-between text-steam">
                <span>Discount</span>
                <span className="text-cream">− {discount}</span>
              </p>
            )}
            {tax && (
              <p className="flex justify-between text-steam">
                <span>{taxLabel}</span>
                <span className="text-cream">{tax}</span>
              </p>
            )}
            <p className="flex justify-between border-t border-ink-line pt-1 font-semibold">
              <span className="text-cream">Total</span>
              <span className="text-fizz">{total}</span>
            </p>
          </div>
        )}

        {changeDue && Number(changeDue.replace(/[^0-9.]/g, "")) > 0 && (
          <div className="mt-5 rounded-fizz border border-ink-line bg-ink p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-steam">
              Change due
            </p>
            <p className="font-display text-3xl font-bold text-bubble">
              {changeDue}
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-fizz bg-fizz px-4 py-3 font-display font-bold text-ink transition-transform hover:scale-[1.02]"
        >
          New order
          <kbd className="ml-2 rounded bg-ink/20 px-1.5 py-0.5 text-xs">↵</kbd>
        </button>
      </div>
    </div>
  );
}
