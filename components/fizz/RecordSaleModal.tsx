"use client";

import { useEffect, useState } from "react";
import DailySaleForm from "./DailySaleForm";

export default function RecordSaleModal({ currency }: { currency: string }) {
  const [open, setOpen] = useState(false);

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105"
      >
        Record a day
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/80 p-4 py-10 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 rounded-full border border-ink-line bg-ink-soft px-3 py-1 text-sm text-steam transition-colors hover:border-fizz hover:text-fizz"
            >
              ✕
            </button>
            <DailySaleForm currency={currency} onSuccess={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
