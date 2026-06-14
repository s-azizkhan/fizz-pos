"use client";

import { MENU_ICON_SUGGESTIONS } from "@/lib/db/schema";
import { resolveCategoryIcon } from "./category-icons";

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";

// Free-form category icon picker: type any emoji or pick a suggestion.
export default function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className={labelCls}>Icon</span>
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-fizz border border-ink-line bg-ink text-2xl"
          aria-hidden
        >
          {resolveCategoryIcon(value)}
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={8}
          placeholder="Paste any emoji"
          className={`${inputCls} max-w-[180px] text-xl`}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MENU_ICON_SUGGESTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={`flex h-9 w-9 items-center justify-center rounded-fizz border text-lg transition-colors ${
              value === emoji ? "border-fizz" : "border-ink-line hover:border-steam"
            }`}
            aria-label={`Use ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
