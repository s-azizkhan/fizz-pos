"use client";

import { useActionState, useEffect, useState } from "react";
import { recordStockMovement, type InventoryState } from "@/app/actions/inventory";
import { stockMovementType, STOCK_MOVEMENT_LABELS } from "@/lib/db/schema";
import type { InventoryItem } from "@/lib/db/schema";
import { useActionToast } from "@/lib/hooks/useActionToast";

const initial: InventoryState = { ok: false };

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";

export default function StockMovementForm({
  item,
  onSuccess,
}: {
  item: InventoryItem;
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState(recordStockMovement, initial);
  useActionToast(state, { success: "Stock updated" });
  const [type, setType] = useState<string>("receive");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (state.ok) onSuccess?.();
  }, [state.ok, onSuccess]);

  const current = Number(item.quantity);
  const amt = Number(amount) || 0;
  const projected =
    type === "adjust" ? amt : type === "receive" ? current + amt : current - amt;

  return (
    <form action={action} className="rounded-fizz border border-ink-line bg-ink-soft p-7">
      <input type="hidden" name="itemId" value={item.id} />
      <h2 className="font-display text-xl font-bold tracking-tight">Adjust stock</h2>
      <p className="mt-1 text-sm text-steam">
        {item.name} — on hand{" "}
        <span className="font-semibold text-cream">
          {current} {item.unit}
        </span>
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Movement</span>
          <select name="type" value={type} onChange={(e) => setType(e.target.value)} className={`${inputCls} appearance-none`}>
            {stockMovementType.enumValues.map((t) => (
              <option key={t} value={t} className="bg-ink-soft text-cream">
                {STOCK_MOVEMENT_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>{type === "adjust" ? "New count" : "Amount"}</span>
          <input name="amount" type="number" min={0} step="0.001" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={inputCls} />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className={labelCls}>Note</span>
          <input name="note" placeholder="Optional — e.g. supplier delivery" className={inputCls} />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="rounded-fizz border border-fizz/40 bg-fizz/5 px-4 py-3">
          <span className={labelCls}>Resulting stock</span>
          <p className={`mt-1 font-display text-lg font-semibold ${projected < 0 ? "text-[#E2655A]" : "text-fizz"}`}>
            {projected} {item.unit}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {state.error && <span className="text-sm text-[#E2655A]">{state.error}</span>}
          <button type="submit" disabled={pending || projected < 0} className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60">
            {pending ? "Saving…" : "Record movement"}
          </button>
        </div>
      </div>
    </form>
  );
}
