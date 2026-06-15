"use client";

import { useEffect, useState } from "react";
import { fetchMovements } from "@/app/actions/inventory";
import {
  INVENTORY_UNIT_LABELS,
  STOCK_MOVEMENT_LABELS,
  type StockMovementType,
} from "@/lib/db/schema";
import type { InventoryItemRow, StockMovementRow } from "@/lib/store/inventory";

// Visual identity per movement type. `credit` drives the +/− sign treatment;
// `tone` is a Tailwind text class from the brand palette.
const STYLE: Record<
  StockMovementType,
  { tone: string; ring: string; glyph: string; credit: boolean | null }
> = {
  receive: { tone: "text-fizz", ring: "border-fizz/40 bg-fizz/10", glyph: "↑", credit: true },
  sale: { tone: "text-bubble", ring: "border-bubble/40 bg-bubble/10", glyph: "↓", credit: false },
  waste: { tone: "text-[#E2655A]", ring: "border-[#E2655A]/40 bg-[#E2655A]/10", glyph: "✕", credit: false },
  adjust: { tone: "text-steam", ring: "border-ink-line bg-ink", glyph: "≈", credit: null },
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function shortUnit(unit: InventoryItemRow["unit"]) {
  return INVENTORY_UNIT_LABELS[unit].replace(/ .*/, "");
}

export default function StockHistory({ item }: { item: InventoryItemRow }) {
  const [rows, setRows] = useState<StockMovementRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unit = shortUnit(item.unit);

  useEffect(() => {
    let alive = true;
    fetchMovements(item.id).then((res) => {
      if (!alive) return;
      if (res.ok) setRows(res.movements);
      else setError(res.error);
    });
    return () => {
      alive = false;
    };
  }, [item.id]);

  // Lifetime totals from the signed deltas (recounts excluded — they set, not flow).
  const credited = (rows ?? [])
    .filter((m) => Number(m.delta) > 0 && m.type !== "adjust")
    .reduce((s, m) => s + Number(m.delta), 0);
  const debited = (rows ?? [])
    .filter((m) => Number(m.delta) < 0)
    .reduce((s, m) => s + Math.abs(Number(m.delta)), 0);

  return (
    <div className="rounded-fizz border border-ink-line bg-ink-soft p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        Stock log
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-bold tracking-tight">{item.name}</h2>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-steam">On hand</p>
          <p className={`font-display text-xl font-semibold ${item.lowStock ? "text-[#E2655A]" : "text-fizz"}`}>
            {Number(item.quantity)} <span className="text-sm text-steam">{unit}</span>
          </p>
        </div>
      </div>

      {/* Lifetime flow chips */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-fizz border border-ink-line bg-ink p-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-steam">Credited</p>
          <p className="mt-1 font-display text-lg font-semibold text-fizz">
            +{credited.toFixed(3).replace(/\.?0+$/, "")} <span className="text-xs text-steam">{unit}</span>
          </p>
        </div>
        <div className="rounded-fizz border border-ink-line bg-ink p-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-steam">Deducted</p>
          <p className="mt-1 font-display text-lg font-semibold text-bubble">
            −{debited.toFixed(3).replace(/\.?0+$/, "")} <span className="text-xs text-steam">{unit}</span>
          </p>
        </div>
        <div className="rounded-fizz border border-ink-line bg-ink p-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-steam">Movements</p>
          <p className="mt-1 font-display text-lg font-semibold text-cream">{rows?.length ?? "—"}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-6 max-h-[50vh] overflow-y-auto pr-1">
        {error ? (
          <p className="rounded-fizz border border-[#E2655A]/40 bg-[#E2655A]/5 p-4 text-sm text-[#E2655A]">
            {error}
          </p>
        ) : rows === null ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-fizz border border-ink-line bg-ink" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-fizz border border-ink-line bg-ink p-6 text-center text-sm text-steam">
            No movements yet. Deliveries, waste, recounts, and sales land here.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {rows.map((m) => {
              const s = STYLE[m.type];
              const delta = Number(m.delta);
              const signed = `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(3).replace(/\.?0+$/, "")}`;
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-fizz border border-ink-line bg-ink p-3"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm ${s.ring} ${s.tone}`}>
                    {s.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-cream">{STOCK_MOVEMENT_LABELS[m.type]}</span>
                      {m.note && <span className="truncate text-xs text-steam">· {m.note}</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-steam">
                      {dateFmt.format(new Date(m.createdAt))}
                      {m.enteredByName ? ` · ${m.enteredByName}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-display font-semibold ${s.tone}`}>
                      {signed} <span className="text-xs text-steam">{unit}</span>
                    </p>
                    <p className="text-[11px] text-steam">
                      bal {Number(m.resulting)} {unit}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
