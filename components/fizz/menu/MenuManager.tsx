"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { currencySymbol, formatMoney } from "@/lib/store/format";
import { toast } from "@/lib/store/toast";
import { useTRPC } from "@/lib/trpc/client";
import { MenuCategoryIconGlyph } from "./category-icons";
import IconPicker from "./IconPicker";
import RecipeEditor from "./RecipeEditor";
import { applyOrder, useDragSort } from "./useDragSort";
import type {
  MenuCategoryWithItems,
  MenuItemWithVariants,
} from "@/lib/store/menu";
import type { RecipeIngredient } from "@/lib/store/recipe";
import type { RecipeComponent } from "@/lib/db/schema";
import NumberInput from "@/components/fizz/ui/NumberInput";
import { BoxIcon, CheckIcon, CloseIcon, EyeIcon, EyeOffIcon, GripIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/fizz/dashboard/icons";

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-fizz bg-fizz px-5 py-2.5 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-fizz border border-ink-line px-4 py-2 text-sm font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz";
// touch-none: the browser must not scroll while a finger drags the grip.
const gripCls =
  "inline-flex shrink-0 touch-none cursor-grab items-center justify-center rounded-fizz text-steam hover:text-fizz focus-visible:text-fizz active:cursor-grabbing data-[dragging]:text-fizz";

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
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:flex">
          <input
            value={v.name}
            placeholder="e.g. Large"
            onChange={(e) =>
              setVariants(variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
            }
            className={`${inputCls} col-span-3`}
          />
          <NumberInput
            value={v.price}
            placeholder="Price"
            aria-label="Variant price"
            onChange={(price) =>
              setVariants(variants.map((x, j) => (j === i ? { ...x, price } : x)))
            }
            className="sm:max-w-[110px]"
          />
          <NumberInput
            value={v.cost}
            placeholder="Cost"
            aria-label="Variant cost of goods"
            onChange={(cost) =>
              setVariants(variants.map((x, j) => (j === i ? { ...x, cost } : x)))
            }
            className="sm:max-w-[110px]"
          />
          <button
            type="button"
            onClick={() => setVariants(variants.filter((_, j) => j !== i))}
            className="inline-flex items-center justify-center rounded-fizz border border-ink-line px-3 text-steam hover:border-[#E2655A] hover:text-[#E2655A]"
            aria-label="Remove variant"
          >
            <CloseIcon className="h-4 w-4 shrink-0" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setVariants([...variants, { name: "", price: "", cost: "" }])}
        className={`${btnGhost} self-start`}
      >
        <PlusIcon className="h-4 w-4 shrink-0" />
        Add variant
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
  const [diet, setDiet] = useState(item?.diet ?? "");
  const [variants, setVariants] = useState<VariantDraft[]>(
    item?.variants.map((v) => ({ name: v.name, price: v.price, cost: v.cost })) ?? [],
  );
  const trpc = useTRPC();
  // Both hooks called unconditionally; pick which one to fire.
  const create = useMutation(trpc.menu.createItem.mutationOptions());
  const update = useMutation(trpc.menu.updateItem.mutationOptions());
  const save = item ? update : create;
  const error = save.error?.message ?? null;

  // Live margin preview from the base price/cost.
  const priceN = Number(price) || 0;
  const costN = Number(cost) || 0;
  const marginN = priceN - costN;
  const marginPct = priceN > 0 ? (marginN / priceN) * 100 : 0;

  function submit() {
    const cleanVariants = variants
      .filter((v) => v.name.trim())
      .map((v) => ({
        name: v.name.trim(),
        price: v.price === "" ? "0" : v.price,
        cost: v.cost === "" ? "0" : v.cost,
      }));
    // `available` goes over the wire as a real boolean now. It used to be
    // String(false) === "false", which z.coerce.boolean() read as TRUE — so an
    // item could never be saved as unavailable.
    save.mutate(
      {
        ...(item ? { id: item.id } : {}),
        categoryId,
        name,
        description,
        price: price === "" ? "0" : price,
        cost: cost === "" ? "0" : cost,
        available,
        diet,
        // recipeForm/itemForm still parse variants from a JSON string.
        variants: JSON.stringify(cleanVariants),
      } as never,
      { onSuccess: () => onDone() },
    );
  }

  return (
    <div className="rounded-fizz border border-fizz/40 bg-fizz/5 p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <NumberInput value={price} onChange={setPrice} prefix={currencySymbol(currency)} />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Item cost ({currency})</span>
          <NumberInput value={cost} placeholder="0.00" onChange={setCost} prefix={currencySymbol(currency)} />
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
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className={labelCls}>Diet</span>
          <select value={diet} onChange={(e) => setDiet(e.target.value)} className={inputCls}>
            <option value="">No tag</option>
            <option value="veg">Veg</option>
            <option value="nonveg">Non-Veg</option>
          </select>
        </label>
        <label className="flex items-center gap-3 sm:col-span-2">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="h-5 w-5 accent-[#C6F432]" />
          <span className="text-sm text-cream">Available</span>
        </label>
        <div className="sm:col-span-2">
          <VariantEditor variants={variants} setVariants={setVariants} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={submit} disabled={save.isPending || !name.trim()} className={`${btnPrimary} flex-1 sm:flex-none`}>
          <CheckIcon className="h-4 w-4 shrink-0" />
          {save.isPending ? "Saving…" : item ? "Save item" : "Add item"}
        </button>
        <button type="button" onClick={onDone} className={btnGhost}>
          <CloseIcon className="h-4 w-4 shrink-0" />
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
  ingredients,
  recipe,
  grip,
}: {
  item: MenuItemWithVariants;
  categoryId: string;
  currency: string;
  ingredients: RecipeIngredient[];
  recipe: RecipeComponent[];
  grip: ReturnType<ReturnType<typeof useDragSort>["handle"]>;
}) {
  const [editing, setEditing] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const trpc = useTRPC();
  const toggle = useMutation(trpc.menu.toggleAvailable.mutationOptions());
  // Failure toasts come from the global MutationCache handler.
  const del = useMutation(
    trpc.menu.deleteItem.mutationOptions({
      onSuccess: () => toast.success("Item deleted"),
    }),
  );

  if (editing) {
    return <ItemForm categoryId={categoryId} item={item} currency={currency} onDone={() => setEditing(false)} />;
  }

  if (recipeOpen) {
    return (
      <RecipeEditor
        item={item}
        recipe={recipe}
        ingredients={ingredients}
        onDone={() => setRecipeOpen(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-fizz border border-ink-line bg-ink p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <button {...grip} className={`${gripCls} -my-1 -ml-1 p-1`}>
            <GripIcon className="h-4 w-4" />
          </button>
          <span className="min-w-0 break-words font-semibold text-cream">{item.name}</span>
          {!item.available && (
            <span className="rounded-full border border-[#E2655A]/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#E2655A]">
              Hidden
            </span>
          )}
          <span className="ml-auto shrink-0 font-display font-semibold text-fizz sm:hidden">{formatMoney(item.price, currency)}</span>
        </div>
        {item.description && <p className="mt-1 text-sm text-steam">{item.description}</p>}
        {item.variants.length > 0 && (
          <p className="mt-1 text-xs text-steam">
            {item.variants.map((v) => `${v.name} ${formatMoney(v.price, currency)}`).join(" · ")}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center sm:gap-3">
        <span className="hidden font-display font-semibold text-fizz sm:inline">{formatMoney(item.price, currency)}</span>
        <button
          type="button"
          onClick={() => toggle.mutate({ id: item.id })}
          disabled={toggle.isPending}
          className="inline-flex items-center justify-center gap-1 rounded-full border border-ink-line whitespace-nowrap px-2 py-2 text-xs sm:px-3 sm:py-1 font-semibold text-steam hover:border-fizz hover:text-fizz"
        >
          {item.available ? <EyeOffIcon className="h-3.5 w-3.5 shrink-0" /> : <EyeIcon className="h-3.5 w-3.5 shrink-0" />}
          {item.available ? "Hide" : "Show"}
        </button>
        <button
          type="button"
          onClick={() => setRecipeOpen(true)}
          className={`inline-flex items-center justify-center gap-1 rounded-full border whitespace-nowrap px-2 py-2 text-xs sm:px-3 sm:py-1 font-semibold transition-colors ${
            recipe.length > 0
              ? "border-fizz/50 text-fizz hover:border-fizz"
              : "border-ink-line text-steam hover:border-fizz hover:text-fizz"
          }`}
          title="Map this item to stock so sales auto-deduct"
        >
          <BoxIcon className="h-3.5 w-3.5 shrink-0" />
          Recipe{recipe.length > 0 ? ` · ${recipe.length}` : ""}
        </button>
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center justify-center gap-1 rounded-full border border-ink-line whitespace-nowrap px-2 py-2 text-xs sm:px-3 sm:py-1 font-semibold text-steam hover:border-fizz hover:text-fizz">
          <PencilIcon className="h-3.5 w-3.5 shrink-0" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => del.mutate({ id: item.id })}
          disabled={del.isPending}
          className="inline-flex items-center justify-center gap-1 rounded-full border border-ink-line whitespace-nowrap px-2 py-2 text-xs sm:px-3 sm:py-1 font-semibold text-steam hover:border-[#E2655A] hover:text-[#E2655A]"
        >
          <TrashIcon className="h-3.5 w-3.5 shrink-0" />
          Delete
        </button>
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  currency,
  grip,
  collapsed,
  ingredients,
  recipes,
}: {
  category: MenuCategoryWithItems;
  currency: string;
  grip: ReturnType<ReturnType<typeof useDragSort>["handle"]>;
  collapsed: boolean;
  ingredients: RecipeIngredient[];
  recipes: Record<string, RecipeComponent[]>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  const [adding, setAdding] = useState(false);
  const trpc = useTRPC();
  const update = useMutation(
    // Error renders inline below; silence the duplicate global toast.
    trpc.menu.updateCategory.mutationOptions({
      meta: { silentError: true },
      onSuccess: () => setEditing(false),
    }),
  );
  const del = useMutation(
    trpc.menu.deleteCategory.mutationOptions({
      onSuccess: () => toast.success("Category deleted"),
    }),
  );
  const error = update.error?.message ?? null;

  // Same optimistic-order pattern as categories in MenuManager below.
  const [itemOrder, setItemOrder] = useState<string[] | null>(null);
  const reorderItems = useMutation(
    trpc.menu.reorderItems.mutationOptions({
      meta: { noRefresh: true },
      onError: () => setItemOrder(null),
    }),
  );
  const items = applyOrder(category.items, itemOrder);
  const itemSort = useDragSort(`items-${category.id}`, items.map((i) => i.id), (ids) => {
    setItemOrder(ids);
    reorderItems.mutate({ categoryId: category.id, ids });
  });
  const shownItems = applyOrder(items, itemSort.order);

  function saveCategory() {
    update.mutate({ id: category.id, name, icon });
  }

  return (
    <div className="rounded-fizz border border-ink-line bg-ink-soft p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-[10rem] flex-1 items-center gap-3">
          <button {...grip} className={`${gripCls} -ml-2 p-2`}>
            <GripIcon className="h-5 w-5" />
          </button>
          <span className="text-2xl"><MenuCategoryIconGlyph name={category.icon} /></span>
          {editing ? (
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} min-w-0 sm:max-w-[220px]`} />
          ) : (
            <h3 className="min-w-0 font-display text-lg font-bold tracking-tight sm:text-xl">{category.name}</h3>
          )}
          <span className="shrink-0 text-sm text-steam">({category.items.length})</span>
        </div>
        <div className="flex items-center gap-3">
          {editing ? (
            <>
              <button type="button" onClick={saveCategory} disabled={update.isPending} className={btnPrimary}><CheckIcon className="h-4 w-4 shrink-0" />Save</button>
              <button type="button" onClick={() => { setEditing(false); setName(category.name); setIcon(category.icon); }} className={btnGhost}><CloseIcon className="h-4 w-4 shrink-0" />Cancel</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center justify-center gap-2 rounded-fizz border border-ink-line px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2 text-cream transition-colors hover:border-fizz hover:text-fizz" aria-label="Edit category"><PencilIcon className="h-4 w-4 shrink-0" /><span className="hidden sm:inline">Edit</span></button>
              <button
                type="button"
                onClick={() => del.mutate({ id: category.id })}
                aria-label="Delete category"
                disabled={del.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-fizz border border-ink-line px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2 text-steam hover:border-[#E2655A] hover:text-[#E2655A]"
              >
                <TrashIcon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {editing && !collapsed && (
        <div className="mt-4 flex flex-col gap-2">
          <IconPicker value={icon} onChange={setIcon} />
          {error && <span className="text-sm text-[#E2655A]">{error}</span>}
        </div>
      )}

      {/* Collapsed while any category is dragged, so tall cards are easy to move. */}
      {!collapsed && (
      <div className="mt-4 flex flex-col gap-3 sm:mt-5">
        {shownItems.map((it) => (
          <div
            key={it.id}
            data-sort={`items-${category.id}`}
            data-id={it.id}
            className={itemSort.dragId === it.id ? "rounded-fizz opacity-70 ring-2 ring-fizz/40" : undefined}
          >
          <ItemRow
            item={it}
            categoryId={category.id}
            currency={currency}
            ingredients={ingredients}
            recipe={recipes[it.id] ?? []}
            grip={itemSort.handle(it.id)}
          />
          </div>
        ))}
        {adding ? (
          <ItemForm categoryId={category.id} currency={currency} onDone={() => setAdding(false)} />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={`${btnGhost} self-start`}>
            <PlusIcon className="h-4 w-4 shrink-0" />
            Add item
          </button>
        )}
      </div>
      )}
    </div>
  );
}

export default function MenuManager({
  categories: initial,
  currency,
  ingredients,
  recipes,
}: {
  categories: MenuCategoryWithItems[];
  currency: string;
  ingredients: RecipeIngredient[];
  recipes: Record<string, RecipeComponent[]>;
}) {
  const trpc = useTRPC();
  // Optimistic: no page refresh needed on success; on failure drop the local
  // order so the server's order shows again (the global toast says why).
  const reorder = useMutation(
    trpc.menu.reorderCategories.mutationOptions({
      meta: { noRefresh: true },
      onError: () => setOrder(null),
    }),
  );

  // Only the optimistic ORDER lives in state — never the category rows
  // themselves. Holding the rows here meant a fresh server render (after any
  // menu mutation) was ignored, so hiding or renaming an item looked like a
  // no-op until a full page load.
  const [order, setOrder] = useState<string[] | null>(null);
  const categories = applyOrder(initial, order);
  const sort = useDragSort("categories", categories.map((c) => c.id), (ids) => {
    setOrder(ids);
    // Optimistic: local order is already applied; see `reorder` above.
    reorder.mutate(ids);
  });
  const shown = applyOrder(categories, sort.order);

  return (
    <div className="flex flex-col gap-6">
      {categories.length === 0 ? (
        <div className="rounded-fizz border border-ink-line bg-ink-soft p-6 text-center text-steam sm:p-10">
          No categories yet. Create one above to start building your menu.
        </div>
      ) : (
        shown.map((c) => (
          <div
            key={c.id}
            data-sort="categories"
            data-id={c.id}
            className={sort.dragId === c.id ? "rounded-fizz opacity-70 ring-2 ring-fizz/40" : undefined}
          >
            <CategoryCard
              category={c}
              currency={currency}
              grip={sort.handle(c.id)}
              collapsed={sort.dragId !== null}
              ingredients={ingredients}
              recipes={recipes}
            />
          </div>
        ))
      )}
    </div>
  );
}
