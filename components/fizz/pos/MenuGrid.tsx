"use client";

import type { PosItem } from "./types";

// The tappable item grid. Cards show name, price, and a quick-add hint (1-9 for
// the first nine). Big hit targets for a touch counter, lime accent on hover.
export default function MenuGrid({
  items,
  onAdd,
  money,
  empty,
}: {
  items: PosItem[];
  onAdd: (item: PosItem) => void;
  money: (n: number) => string;
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-steam">
        {empty}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {items.map((it, i) => {
          const fromPrice =
            it.variants.length > 0
              ? Math.min(...it.variants.map((v) => v.price))
              : it.price;
          return (
            <button
              key={it.id}
              onClick={() => onAdd(it)}
              className="group relative flex h-28 flex-col justify-between rounded-fizz border border-ink-line bg-ink-soft p-4 text-left transition-all hover:-translate-y-0.5 hover:border-fizz focus:border-fizz focus:outline-none focus:ring-2 focus:ring-fizz/40"
            >
              {i < 9 && (
                <span className="absolute right-2 top-2 rounded-md border border-ink-line px-1.5 py-0.5 font-display text-[10px] text-steam group-hover:border-fizz group-hover:text-fizz">
                  {i + 1}
                </span>
              )}
              <span className="line-clamp-2 pr-6 font-medium text-cream">
                {it.name}
              </span>
              <span className="font-display font-bold text-fizz">
                {it.variants.length > 0 ? `from ${money(fromPrice)}` : money(it.price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
