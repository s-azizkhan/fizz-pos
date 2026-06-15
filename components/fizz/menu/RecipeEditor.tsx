"use client";

import { useMemo, useState, useTransition } from "react";
import { saveRecipe, type RecipeState } from "@/app/actions/recipe";
import { toast } from "@/lib/store/toast";
import type { RecipeIngredient } from "@/lib/store/recipe";
import type { MenuItemWithVariants } from "@/lib/store/menu";
import type { RecipeComponent } from "@/lib/db/schema";

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";
const btnPrimary =
  "rounded-fizz bg-fizz px-5 py-2.5 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60";
const btnGhost =
  "rounded-fizz border border-ink-line px-4 py-2 text-sm font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz";

type Draft = { inventoryItemId: string; quantity: string };

// "base" sentinel = the item's recipe with variantId null; otherwise a variant id.
const BASE = "base";

export default function RecipeEditor({
  item,
  recipe,
  ingredients,
  onDone,
}: {
  item: MenuItemWithVariants;
  recipe: RecipeComponent[];
  ingredients: RecipeIngredient[];
  onDone: () => void;
}) {
  const [scope, setScope] = useState<string>(BASE);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Rows for the currently selected scope, derived fresh from `recipe` whenever
  // the scope flips. Local edits live in `drafts` keyed by scope.
  const initialFor = useMemo(() => {
    const map: Record<string, Draft[]> = {};
    const push = (key: string, rows: RecipeComponent[]) => {
      map[key] = rows.map((r) => ({
        inventoryItemId: r.inventoryItemId,
        quantity: r.quantity,
      }));
    };
    push(BASE, recipe.filter((r) => !r.variantId));
    for (const v of item.variants) {
      push(v.id, recipe.filter((r) => r.variantId === v.id));
    }
    return map;
  }, [recipe, item.variants]);

  const [drafts, setDrafts] = useState<Record<string, Draft[]>>(initialFor);
  const rows = drafts[scope] ?? [];
  const setRows = (next: Draft[]) =>
    setDrafts((d) => ({ ...d, [scope]: next }));

  const unitOf = (id: string) => ingredients.find((i) => i.id === id)?.unit ?? "";

  function submit() {
    setError(null);
    const clean = rows
      .filter((r) => r.inventoryItemId && r.quantity !== "" && Number(r.quantity) > 0)
      .map((r) => ({ inventoryItemId: r.inventoryItemId, quantity: r.quantity }));

    const fd = new FormData();
    fd.set("menuItemId", item.id);
    if (scope !== BASE) fd.set("variantId", scope);
    fd.set("components", JSON.stringify(clean));

    startTransition(async () => {
      const res: RecipeState = await saveRecipe({ ok: false }, fd);
      if (res.ok) {
        toast.success("Recipe saved");
        onDone();
      } else {
        setError(res.error ?? "Failed");
        toast.error(res.error ?? "Couldn't save recipe");
      }
    });
  }

  if (ingredients.length === 0) {
    return (
      <div className="rounded-fizz border border-fizz/40 bg-fizz/5 p-5">
        <p className="text-sm text-steam">
          Add stock items in <span className="text-cream">Inventory</span> first —
          then map them here so each sale burns the right ingredients.
        </p>
        <button type="button" onClick={onDone} className={`${btnGhost} mt-4`}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-fizz border border-fizz/40 bg-fizz/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={labelCls}>Recipe — {item.name}</span>
        {item.variants.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-steam">
            Scope
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className={`${inputCls} max-w-[200px] py-2`}
            >
              <option value={BASE}>Base (all)</option>
              {item.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="mt-2 text-xs text-steam">
        How much stock one sale consumes. Variant scopes override the base; leave
        a variant empty to fall back to the base recipe.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={row.inventoryItemId}
              onChange={(e) =>
                setRows(rows.map((x, j) => (j === i ? { ...x, inventoryItemId: e.target.value } : x)))
              }
              className={inputCls}
            >
              <option value="">Pick ingredient…</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                value={row.quantity}
                type="number"
                min={0}
                step="0.001"
                placeholder="Qty"
                onChange={(e) =>
                  setRows(rows.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))
                }
                className={`${inputCls} max-w-[110px]`}
              />
              <span className="w-10 text-sm text-steam">{unitOf(row.inventoryItemId)}</span>
            </div>
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              className="rounded-fizz border border-ink-line px-3 text-steam hover:border-[#E2655A] hover:text-[#E2655A]"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows([...rows, { inventoryItemId: "", quantity: "" }])}
          className={`${btnGhost} self-start`}
        >
          + Add ingredient
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={submit} disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : "Save recipe"}
        </button>
        <button type="button" onClick={onDone} className={btnGhost}>
          Done
        </button>
        {error && <span className="text-sm text-[#E2655A]">{error}</span>}
      </div>
    </div>
  );
}
