"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/store/format";
import { Chip, ChipBar } from "@/components/fizz/ui/controls";
import type { ItemMargin, MarginsSummary } from "@/lib/store/margins";

type SortKey = "marginPct" | "profit" | "unitsSold" | "price" | "name";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "profit", label: "Most profit" },
  { value: "marginPct", label: "Best margin %" },
  { value: "unitsSold", label: "Best sellers" },
  { value: "price", label: "Price" },
  { value: "name", label: "Name" },
];

// Colour a margin percentage by health: green = healthy, amber = thin,
// red = losing money. Café rule of thumb: aim for 65%+ gross margin.
function marginClass(pct: number, hasCost: boolean): string {
  if (!hasCost) return "text-steam";
  if (pct < 0) return "text-[#E2655A]";
  if (pct < 50) return "text-[#E2655A]";
  if (pct < 65) return "text-bubble";
  return "text-fizz";
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-fizz border border-ink-line bg-ink-soft p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steam">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold text-cream">{value}</p>
      {hint && <p className="mt-1 text-xs text-steam">{hint}</p>}
    </div>
  );
}

// Margins dashboard. Theoretical margin per menu item (price vs cost) alongside
// realized profit pulled from paid orders. Set item costs on the Menu page.
export default function MarginsClient({
  summary,
  currency,
}: {
  summary: MarginsSummary;
  currency: string;
}) {
  const [sort, setSort] = useState<SortKey>("profit");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const money = (n: number) => formatMoney(n, currency);

  const rows = useMemo(() => {
    let list = [...summary.items];
    if (onlyMissing) list = list.filter((i) => !i.hasCost);
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return (b[sort] as number) - (a[sort] as number);
    });
    return list;
  }, [summary.items, sort, onlyMissing]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Profit
          </p>
          <h1 className="mt-2 font-display text-[clamp(26px,4vw,40px)] font-bold tracking-tight">
            Margins
          </h1>
          <p className="mt-1 text-steam">
            Real cost per item. Know your margin before you pour.
          </p>
        </div>
        <a
          href="/dashboard/menu"
          className="rounded-fizz border border-ink-line bg-ink-soft px-5 py-3 text-sm font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
        >
          Set item costs →
        </a>
      </div>

      {/* Summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Revenue (paid)"
          value={money(summary.totalRevenue)}
          hint="From settled orders"
        />
        <Stat
          label="Cost of goods"
          value={money(summary.totalCost)}
          hint="Sold units × item cost"
        />
        <Stat
          label="Gross profit"
          value={money(summary.totalProfit)}
          hint={`${summary.blendedMarginPct.toFixed(0)}% blended margin`}
        />
        <Stat
          label="Avg menu margin"
          value={`${summary.avgMarginPct.toFixed(0)}%`}
          hint="Across priced items"
        />
      </div>

      {summary.itemsWithoutCost > 0 && (
        <ChipBar className="mt-4">
          <Chip
            tone="danger"
            active={onlyMissing}
            onClick={() => setOnlyMissing((v) => !v)}
          >
            ⚠ {summary.itemsWithoutCost} item
            {summary.itemsWithoutCost === 1 ? "" : "s"} missing a cost
            {onlyMissing ? " — showing only these" : " — filter"}
          </Chip>
        </ChipBar>
      )}

      {/* Sort */}
      <ChipBar label="Sort" className="mt-6">
        {SORTS.map((s) => (
          <Chip
            key={s.value}
            active={sort === s.value}
            onClick={() => setSort(s.value)}
          >
            {s.label}
          </Chip>
        ))}
      </ChipBar>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="mt-8 flex min-h-[30vh] items-center justify-center rounded-fizz border border-dashed border-ink-line bg-ink-soft/40">
          <p className="text-steam">
            {onlyMissing ? "Every item has a cost. Nice." : "No menu items yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="mt-6 grid gap-3 sm:hidden">
            {rows.map((it: ItemMargin) => (
              <div
                key={it.id}
                className="rounded-fizz border border-ink-line bg-ink-soft p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-cream">{it.name}</span>
                      {!it.available && (
                        <span className="rounded-full border border-ink-line px-2 py-0.5 text-[10px] uppercase text-steam">
                          Hidden
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-steam">{it.category}</span>
                  </div>
                  <span
                    className={`shrink-0 font-display text-xl font-bold ${marginClass(it.marginPct, it.hasCost)}`}
                  >
                    {it.hasCost ? `${it.marginPct.toFixed(0)}%` : "—"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-steam">Price</p>
                    <p className="text-cream">{money(it.price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-steam">Cost</p>
                    <p>
                      {it.hasCost ? (
                        <span className="text-cream">{money(it.cost)}</span>
                      ) : (
                        <span className="text-[#E2655A]">set cost</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-steam">Margin</p>
                    <p className="text-cream">{it.hasCost ? money(it.margin) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-steam">Sold</p>
                    <p className="text-cream">{it.unitsSold}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-ink-line pt-3">
                  <span className="text-xs uppercase tracking-wide text-steam">
                    Profit
                  </span>
                  <span className="font-display font-bold text-cream">
                    {it.unitsSold > 0 ? money(it.profit) : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Table (sm and up) */}
          <div className="mt-6 hidden overflow-x-auto rounded-fizz border border-ink-line sm:block">
            <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink-line bg-ink-soft text-left text-xs uppercase tracking-wide text-steam">
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 text-right font-semibold">Price</th>
                <th className="px-4 py-3 text-right font-semibold">Cost</th>
                <th className="px-4 py-3 text-right font-semibold">Margin</th>
                <th className="px-4 py-3 text-right font-semibold">Margin %</th>
                <th className="px-4 py-3 text-right font-semibold">Sold</th>
                <th className="px-4 py-3 text-right font-semibold">Profit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it: ItemMargin) => (
                <tr
                  key={it.id}
                  className="border-b border-ink-line last:border-0 hover:bg-ink-soft/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-cream">{it.name}</span>
                      {!it.available && (
                        <span className="rounded-full border border-ink-line px-2 py-0.5 text-[10px] uppercase text-steam">
                          Hidden
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-steam">{it.category}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-cream">{money(it.price)}</td>
                  <td className="px-4 py-3 text-right">
                    {it.hasCost ? (
                      <span className="text-cream">{money(it.cost)}</span>
                    ) : (
                      <span className="text-[#E2655A]">set cost</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-cream">
                    {it.hasCost ? money(it.margin) : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-display font-bold ${marginClass(it.marginPct, it.hasCost)}`}
                  >
                    {it.hasCost ? `${it.marginPct.toFixed(0)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-steam">{it.unitsSold}</td>
                  <td className="px-4 py-3 text-right font-display font-bold text-cream">
                    {it.unitsSold > 0 ? money(it.profit) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-steam">
        Margins use each item&apos;s cost of goods. Realized profit and units
        come from settled orders. Set or update costs on the{" "}
        <a href="/dashboard/menu" className="text-fizz hover:underline">
          Menu
        </a>{" "}
        page.
      </p>
    </div>
  );
}
