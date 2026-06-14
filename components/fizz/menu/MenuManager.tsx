"use client";

import { useState, useTransition } from "react";
import {
  updateCategory,
  deleteCategory,
  reorderCategories,
  createItem,
  updateItem,
  deleteItem,
  toggleItemAvailable,
  type MenuState,
} from "@/app/actions/menu";
import { formatMoney } from "@/lib/store/format";
import { MenuCategoryIconGlyph } from "./category-icons";
import IconPicker from "./IconPicker";
import type {
  MenuCategoryWithItems,
  MenuItemWithVariants,
} from "@/lib/store/menu";

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";
const btnPrimary =
  "rounded-fizz bg-fizz px-5 py-2.5 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60";
const btnGhost =
  "rounded-fizz border border-ink-line px-4 py-2 text-sm font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz";

// Call a server action with a FormData payload built from a plain object.
function toFormData(obj: Record<string, string | number | boolean>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) fd.set(k, String(v));
  return fd;
}

type VariantDraft = { name: string; price: string; cost: string };

function VariantEditor({
  variants,
  setVariants,
}: {
  variants: VariantDraft[];
  setVariants: (v: VariantDraft[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className={labelCls}>Variants</span>
      {variants.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={v.name}
            placeholder="e.g. Large"
            onChange={(e) =>
              setVariants(variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
            }
            className={inputCls}
          />
          <input
            value={v.price}
            type="number"
            min={0}
            step="0.01"
            placeholder="Price"
            onChange={(e) =>
              setVariants(variants.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))
            }
            className={`${inputCls} max-w-[110px]`}
          />
          <input
            value={v.cost}
            type="number"
            min={0}
            step="0.01"
            placeholder="Cost"
            title="Cost of goods for this variant"
            onChange={(e) =>
              setVariants(variants.map((x, j) => (j === i ? { ...x, cost: e.target.value } : x)))
            }
            className={`${inputCls} max-w-[110px]`}
          />
          <button
            type="button"
            onClick={() => setVariants(variants.filter((_, j) => j !== i))}
            className="rounded-fizz border border-ink-line px-3 text-steam hover:border-[#E2655A] hover:text-[#E2655A]"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setVariants([...variants, { name: "", price: "", cost: "" }])}
        className={`${btnGhost} self-start`}
      >
        + Add variant
      </button>
    </div>
  );
}

function ItemForm({
  categoryId,
  item,
  currency,
  onDone,
}: {
  categoryId: string;
  item?: MenuItemWithVariants;
  currency: string;
  onDone: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price ?? "");
  const [cost, setCost] = useState(item?.cost ?? "");
  const [available, setAvailable] = useState(item?.available ?? true);
  const [variants, setVariants] = useState<VariantDraft[]>(
    item?.variants.map((v) => ({ name: v.name, price: v.price, cost: v.cost })) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Live margin preview from the base price/cost.
  const priceN = Number(price) || 0;
  const costN = Number(cost) || 0;
  const marginN = priceN - costN;
  const marginPct = priceN > 0 ? (marginN / priceN) * 100 : 0;

  function submit() {
    setError(null);
    const cleanVariants = variants
      .filter((v) => v.name.trim())
      .map((v) => ({
        name: v.name.trim(),
        price: v.price === "" ? "0" : v.price,
        cost: v.cost === "" ? "0" : v.cost,
      }));
    const payload = toFormData({
      categoryId,
      name,
      description,
      price: price === "" ? "0" : price,
      cost: cost === "" ? "0" : cost,
      available,
      variants: JSON.stringify(cleanVariants),
    });
    if (item) payload.set("id", String(item.id));
    startTransition(async () => {
      const res: MenuState = item
        ? await updateItem({ ok: false }, payload)
        : await createItem({ ok: false }, payload);
      if (res.ok) onDone();
      else setError(res.error ?? "Failed");
    });
  }

  return (
    <div className="rounded-fizz border border-fizz/40 bg-fizz/5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className={labelCls}>Item name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className={labelCls}>Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Base price ({currency})</span>
          <input value={price} type="number" min={0} step="0.01" onChange={(e) => setPrice(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Item cost ({currency})</span>
          <input value={cost} type="number" min={0} step="0.01" placeholder="0.00" onChange={(e) => setCost(e.target.value)} className={inputCls} />
        </label>
        {priceN > 0 && (
          <div className="rounded-fizz border border-ink-line bg-ink px-4 py-3 text-sm sm:col-span-2">
            <span className="text-steam">Margin: </span>
            <span className={marginN >= 0 ? "font-semibold text-fizz" : "font-semibold text-[#E2655A]"}>
              {formatMoney(marginN, currency)} ({marginPct.toFixed(0)}%)
            </span>
            <span className="text-steam"> · food cost {priceN > 0 ? ((costN / priceN) * 100).toFixed(0) : 0}%</span>
          </div>
        )}
        <label className="flex items-center gap-3 sm:col-span-2">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="h-5 w-5 accent-[#C6F432]" />
          <span className="text-sm text-cream">Available</span>
        </label>
        <div className="sm:col-span-2">
          <VariantEditor variants={variants} setVariants={setVariants} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={submit} disabled={pending || !name.trim()} className={btnPrimary}>
          {pending ? "Saving…" : item ? "Save item" : "Add item"}
        </button>
        <button type="button" onClick={onDone} className={btnGhost}>
          Cancel
        </button>
        {error && <span className="text-sm text-[#E2655A]">{error}</span>}
      </div>
    </div>
  );
}

function ItemRow({
  item,
  categoryId,
  currency,
}: {
  item: MenuItemWithVariants;
  categoryId: string;
  currency: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return <ItemForm categoryId={categoryId} item={item} currency={currency} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-fizz border border-ink-line bg-ink p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-cream">{item.name}</span>
          {!item.available && (
            <span className="rounded-full border border-[#E2655A]/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#E2655A]">
              Hidden
            </span>
          )}
        </div>
        {item.description && <p className="mt-1 text-sm text-steam">{item.description}</p>}
        {item.variants.length > 0 && (
          <p className="mt-1 text-xs text-steam">
            {item.variants.map((v) => `${v.name} ${formatMoney(v.price, currency)}`).join(" · ")}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-display font-semibold text-fizz">{formatMoney(item.price, currency)}</span>
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await toggleItemAvailable({ ok: false }, toFormData({ id: item.id }));
            })
          }
          disabled={pending}
          className="rounded-full border border-ink-line px-3 py-1 text-xs font-semibold text-steam hover:border-fizz hover:text-fizz"
        >
          {item.available ? "Hide" : "Show"}
        </button>
        <button type="button" onClick={() => setEditing(true)} className="rounded-full border border-ink-line px-3 py-1 text-xs font-semibold text-steam hover:border-fizz hover:text-fizz">
          Edit
        </button>
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await deleteItem({ ok: false }, toFormData({ id: item.id }));
            })
          }
          disabled={pending}
          className="rounded-full border border-ink-line px-3 py-1 text-xs font-semibold text-steam hover:border-[#E2655A] hover:text-[#E2655A]"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  currency,
  index,
  count,
  onMove,
}: {
  category: MenuCategoryWithItems;
  currency: string;
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveCategory() {
    setError(null);
    startTransition(async () => {
      const res = await updateCategory({ ok: false }, toFormData({ id: category.id, name, icon }));
      if (res.ok) setEditing(false);
      else setError(res.error ?? "Failed");
    });
  }

  return (
    <div className="rounded-fizz border border-ink-line bg-ink-soft p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="text-steam hover:text-fizz disabled:opacity-30" aria-label="Move up">▲</button>
            <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} className="text-steam hover:text-fizz disabled:opacity-30" aria-label="Move down">▼</button>
          </div>
          <span className="text-2xl"><MenuCategoryIconGlyph name={category.icon} /></span>
          {editing ? (
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} max-w-[220px]`} />
          ) : (
            <h3 className="font-display text-xl font-bold tracking-tight">{category.name}</h3>
          )}
          <span className="text-sm text-steam">({category.items.length})</span>
        </div>
        <div className="flex items-center gap-3">
          {editing ? (
            <>
              <button type="button" onClick={saveCategory} disabled={pending} className={btnPrimary}>Save</button>
              <button type="button" onClick={() => { setEditing(false); setName(category.name); setIcon(category.icon); }} className={btnGhost}>Cancel</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditing(true)} className={btnGhost}>Edit</button>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await deleteCategory({ ok: false }, toFormData({ id: category.id }));
                  })
                }
                disabled={pending}
                className="rounded-fizz border border-ink-line px-4 py-2 text-sm font-semibold text-steam hover:border-[#E2655A] hover:text-[#E2655A]"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-4 flex flex-col gap-2">
          <IconPicker value={icon} onChange={setIcon} />
          {error && <span className="text-sm text-[#E2655A]">{error}</span>}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        {category.items.map((it) => (
          <ItemRow key={it.id} item={it} categoryId={category.id} currency={currency} />
        ))}
        {adding ? (
          <ItemForm categoryId={category.id} currency={currency} onDone={() => setAdding(false)} />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={`${btnGhost} self-start`}>
            + Add item
          </button>
        )}
      </div>
    </div>
  );
}

export default function MenuManager({
  categories: initial,
  currency,
}: {
  categories: MenuCategoryWithItems[];
  currency: string;
}) {
  const [categories, setCategories] = useState(initial);
  const [pending, startTransition] = useTransition();

  function move(index: number, dir: -1 | 1) {
    const next = [...categories];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next);
    startTransition(async () => {
      await reorderCategories(next.map((c) => c.id));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {categories.length === 0 ? (
        <div className="rounded-fizz border border-ink-line bg-ink-soft p-10 text-center text-steam">
          No categories yet. Create one above to start building your menu.
        </div>
      ) : (
        categories.map((c, i) => (
          <CategoryCard
            key={c.id}
            category={c}
            currency={currency}
            index={i}
            count={categories.length}
            onMove={(dir) => move(i, dir)}
          />
        ))
      )}
    </div>
  );
}
