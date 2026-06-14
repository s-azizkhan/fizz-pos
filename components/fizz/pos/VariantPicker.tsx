"use client";

import { useEffect } from "react";
import type { PosItem, PosVariant } from "./types";

// Quick variant chooser shown when an item has sizes/options. Number keys 1-9
// pick a variant; Escape closes. Keeps the rush moving without a mouse.
export default function VariantPicker({
  item,
  money,
  onPick,
  onClose,
}: {
  item: PosItem;
  money: (n: number) => string;
  onPick: (variant: PosVariant) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^[1-9]$/.test(e.key)) {
        const v = item.variants[Number(e.key) - 1];
        if (v) {
          e.preventDefault();
          onPick(v);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onPick]);

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
          Choose an option
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold">{item.name}</h2>
        <div className="mt-5 grid gap-2">
          {item.variants.map((v, i) => (
            <button
              key={v.id}
              onClick={() => onPick(v)}
              className="flex items-center justify-between rounded-fizz border border-ink-line bg-ink px-4 py-3 text-left transition-colors hover:border-fizz focus:border-fizz focus:outline-none focus:ring-2 focus:ring-fizz/40"
            >
              <span className="flex items-center gap-3">
                {i < 9 && (
                  <kbd className="rounded-md border border-ink-line px-1.5 py-0.5 font-display text-xs text-steam">
                    {i + 1}
                  </kbd>
                )}
                <span className="font-medium text-cream">{v.name}</span>
              </span>
              <span className="font-display font-bold text-fizz">
                {money(v.price)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
