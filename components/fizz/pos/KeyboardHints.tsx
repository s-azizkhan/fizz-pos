"use client";

import { useState } from "react";

const HINTS: [string, string][] = [
  ["type", "search"],
  ["1–9", "quick add"],
  ["F2 / ↵", "pay"],
  ["⌘⌫", "clear"],
  ["esc", "back"],
];

// A slim, dismissible cheat sheet of the till's keyboard shortcuts. Sits at the
// foot of the menu pane so new staff learn the fast path without a manual.
export default function KeyboardHints() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className="hidden shrink-0 items-center gap-3 border-t border-ink-line px-5 py-2 text-xs text-steam lg:flex">
      <span className="font-semibold uppercase tracking-[0.18em] text-fizz">
        Keys
      </span>
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        {HINTS.map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <kbd className="rounded-md border border-ink-line bg-ink-soft px-1.5 py-0.5 font-display text-[10px] text-cream">
              {k}
            </kbd>
            {v}
          </span>
        ))}
      </div>
      <button
        onClick={() => setOpen(false)}
        aria-label="Hide shortcuts"
        className="rounded-full border border-ink-line px-2 transition-colors hover:border-fizz hover:text-fizz"
      >
        ✕
      </button>
    </div>
  );
}
