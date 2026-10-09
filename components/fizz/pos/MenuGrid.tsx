"use client";

import type { Ref } from "react";
import type { PosItem } from "./types";

export type MenuSection = { id: string; name: string; icon?: string; items: PosItem[] };

// The tappable item grid. Every category stacks into one continuous scroll,
// each under a dashed-rule title; the till's category chips scroll-spy it.
// Cards show name, price, and a quick-add hint (1-9 for the first nine of the
// active section). Big hit targets for a touch counter, lime accent on hover.
// A section with an empty `name` renders untitled (search results).
export default function MenuGrid({
  ref,
  sections,
  activeId,
  onAdd,
  money,
  empty,
  onScroll,
}: {
  ref?: Ref<HTMLDivElement>;
  sections: MenuSection[];
  activeId?: string;
  onAdd: (item: PosItem) => void;
  money: (n: number) => string;
  empty: string;
  onScroll?: () => void;
}) {
  if (sections.every((s) => s.items.length === 0)) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-steam">
        {empty}
      </div>
    );
  }

  // Bottom padding clears the floating cart pill + tab bar.
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="relative min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(9.5rem+env(safe-area-inset-bottom))] lg:pb-4"
    >
      {sections.map((s) => (
        <section key={s.id} id={`till-cat-${s.id}`} data-cat={s.id} className="scroll-mt-4 [&+&]:mt-7">
          {s.name && (
            <h2 className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-steam">
              <span className="w-4 border-t border-dashed border-ink-line" />
              <span className={`flex shrink-0 items-center gap-2 ${s.id === activeId ? "text-fizz" : ""}`}>
                {s.icon && <span aria-hidden className="text-sm">{s.icon}</span>}
                {s.name}
                <span className="font-display text-steam">{s.items.length}</span>
              </span>
              <span className="flex-1 border-t border-dashed border-ink-line" />
            </h2>
          )}
          {s.items.length === 0 ? (
            <p className="text-sm text-steam">Nothing on this tab yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {s.items.map((it, i) => {
                const fromPrice =
                  it.variants.length > 0
                    ? Math.min(...it.variants.map((v) => v.price))
                    : it.price;
                const hint = (!s.name || s.id === activeId) && i < 9;
                return (
                  <button
                    key={it.id}
                    onClick={() => onAdd(it)}
                    className="group relative flex h-28 flex-col justify-between rounded-fizz border border-ink-line bg-ink-soft p-4 text-left transition-all hover:-translate-y-0.5 hover:border-fizz focus:border-fizz focus:outline-none focus:ring-2 focus:ring-fizz/40"
                  >
                    {hint && (
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
          )}
        </section>
      ))}
    </div>
  );
}
