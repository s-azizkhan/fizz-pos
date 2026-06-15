"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createInventoryItem,
  updateInventoryItem,
  type InventoryState,
} from "@/app/actions/inventory";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNIT_LABELS,
  inventoryUnit,
} from "@/lib/db/schema";
import type { InventoryItem } from "@/lib/db/schema";
import { useActionToast } from "@/lib/hooks/useActionToast";

const initial: InventoryState = { ok: false };

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";

export default function InventoryItemForm({
  item,
  currency,
  onSuccess,
}: {
  item?: InventoryItem;
  currency: string;
  onSuccess?: () => void;
}) {
  const action = item ? updateInventoryItem : createInventoryItem;
  const [state, formAction, pending] = useActionState(action, initial);
  useActionToast(state, { success: item ? "Item saved" : "Item added" });
  const formRef = useRef<HTMLFormElement>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaved(true);
      if (!item) formRef.current?.reset();
      onSuccess?.();
      const t = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state.ok, item, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="rounded-fizz border border-ink-line bg-ink-soft p-7">
      {item && <input type="hidden" name="id" value={item.id} />}
      <h2 className="font-display text-xl font-bold tracking-tight">
        {item ? "Edit item" : "New stock item"}
      </h2>
      <p className="mt-1 text-sm text-steam">
        {item
          ? "Update item details. Use stock movements to change quantity."
          : "Add a tracked ingredient or supply."}
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className={labelCls}>Name</span>
          <input name="name" required defaultValue={item?.name ?? ""} placeholder="e.g. Oat Milk" className={inputCls} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>SKU</span>
          <input name="sku" defaultValue={item?.sku ?? ""} placeholder="Optional code" className={inputCls} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Supplier</span>
          <input name="supplier" defaultValue={item?.supplier ?? ""} placeholder="Who you buy from" className={inputCls} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Category</span>
          <select name="category" required defaultValue={item?.category ?? "Other"} className={`${inputCls} appearance-none`}>
            {INVENTORY_CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-ink-soft text-cream">{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Unit</span>
          <select name="unit" required defaultValue={item?.unit ?? "each"} className={`${inputCls} appearance-none`}>
            {inventoryUnit.enumValues.map((u) => (
              <option key={u} value={u} className="bg-ink-soft text-cream">{INVENTORY_UNIT_LABELS[u]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>{item ? "On hand (read-only)" : "Opening quantity"}</span>
          <input
            name="quantity"
            type="number"
            min={0}
            step="0.001"
            defaultValue={item ? Number(item.quantity) : 0}
            disabled={!!item}
            className={`${inputCls} ${item ? "opacity-60" : ""}`}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Reorder level</span>
          <input name="reorderLevel" type="number" min={0} step="0.001" defaultValue={item ? Number(item.reorderLevel) : 0} className={inputCls} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Cost per unit ({currency})</span>
          <input name="costPerUnit" type="number" min={0} step="0.01" defaultValue={item ? Number(item.costPerUnit) : 0} className={inputCls} />
        </label>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button type="submit" disabled={pending} className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60">
          {pending ? "Saving…" : item ? "Save item" : "Add item"}
        </button>
        {saved && <span className="text-sm font-semibold text-fizz">Saved ●</span>}
        {state.error && <span className="text-sm text-[#E2655A]">{state.error}</span>}
      </div>
    </form>
  );
}
