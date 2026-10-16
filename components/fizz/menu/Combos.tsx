"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Modal from "@/components/fizz/Modal";
import { confirmDialog } from "@/components/fizz/ConfirmDialog";
import { toast } from "@/lib/store/toast";
import { useTRPC } from "@/lib/trpc/client";
import { comboSummary, currencySymbol, formatMoney } from "@/lib/store/format";
import type { ComboView, MenuCategoryWithItems } from "@/lib/store/menu";
import {
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/fizz/dashboard/icons";

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";
const iconBtn =
  "rounded-full border border-ink-line p-2 text-steam transition-colors hover:border-fizz hover:text-fizz disabled:opacity-50";

const r2 = (n: number) => Math.round(n * 100) / 100;
const saving = (worth: number, price: number) => {
  const save = r2(worth - price);
  return { save, pct: worth > 0 ? Math.round((save / worth) * 100) : 0 };
};

// The Combos block on the Menu page: every bundle as a deal card, plus the
// builder. Combos sit above the categories on the POS and the public menu.
export default function Combos({
  combos,
  categories,
  currency,
}: {
  combos: ComboView[];
  categories: MenuCategoryWithItems[];
  currency: string;
}) {
  // undefined = closed, null = new, combo = editing.
  const [editing, setEditing] = useState<ComboView | null | undefined>(undefined);
  const money = (n: number | string) => formatMoney(n, currency);

  return (
    <section className="rounded-fizz border border-ink-line bg-ink-soft p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={labelCls}>Combos</p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">Bundle it, sell more</h2>
          <p className="mt-1 max-w-[60ch] text-sm text-steam">
            Group items at one price. Combos pin to the top of the POS and your public menu, with the saving
            up front.
          </p>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="inline-flex items-center gap-2 rounded-fizz bg-fizz px-5 py-2.5 font-semibold text-ink transition-transform hover:scale-105"
        >
          <PlusIcon className="h-4 w-4" />
          New combo
        </button>
      </div>

      {combos.length === 0 ? (
        <button
          onClick={() => setEditing(null)}
          className="mt-6 flex w-full flex-col items-center gap-1 rounded-fizz border border-dashed border-ink-line px-6 py-8 text-center transition-colors hover:border-fizz"
        >
          <span className="font-display text-lg font-bold text-cream">No combos yet</span>
          <span className="text-sm text-steam">Try “Burger + Fries + Coke” for a little less than all three.</span>
        </button>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {combos.map((c) => (
            <ComboRow key={c.id} combo={c} money={money} onEdit={() => setEditing(c)} />
          ))}
        </div>
      )}

      {editing !== undefined && (
        <ComboBuilder
          key={editing?.id ?? "new"}
          combo={editing}
          categories={categories}
          currency={currency}
          onClose={() => setEditing(undefined)}
        />
      )}
    </section>
  );
}

function ComboRow({
  combo,
  money,
  onEdit,
}: {
  combo: ComboView;
  money: (n: number | string) => string;
  onEdit: () => void;
}) {
  const trpc = useTRPC();
  const toggle = useMutation(trpc.menu.toggleCombo.mutationOptions());
  const del = useMutation(
    trpc.menu.deleteCombo.mutationOptions({ onSuccess: () => toast.success("Combo deleted") }),
  );
  const price = Number(combo.price);
  const { save, pct } = saving(combo.worth, price);
  // Switched on but a part went missing or off — it's hidden from sale.
  const broken = combo.available && !combo.sellable;

  return (
    <article
      className={`flex flex-col gap-3 rounded-fizz border bg-ink p-4 ${
        broken ? "border-[#E2655A]/60" : combo.available ? "border-fizz/40" : "border-ink-line opacity-70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold tracking-tight text-cream">{combo.name}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-steam">
            {comboSummary(combo.items)}
          </p>
        </div>
        {save > 0 && (
          <span className="shrink-0 rounded-full bg-fizz px-2.5 py-1 font-display text-xs font-bold text-ink">
            −{pct}%
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl font-bold text-fizz">{money(price)}</span>
          {save > 0 && <span className="text-sm text-steam line-through">{money(combo.worth)}</span>}
          <span
            className={`ml-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
              broken
                ? "border-[#E2655A]/60 text-[#E2655A]"
                : combo.available
                  ? "border-fizz/40 text-fizz"
                  : "border-ink-line text-steam"
            }`}
          >
            {broken ? "Item off menu" : combo.available ? "Live" : "Off"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggle.mutate({ id: combo.id })}
            disabled={toggle.isPending}
            aria-label={combo.available ? "Take off sale" : "Put on sale"}
            className={iconBtn}
          >
            {combo.available ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
          </button>
          <button onClick={onEdit} aria-label="Edit combo" className={iconBtn}>
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={async () => {
              if (
                await confirmDialog({
                  title: `Delete ${combo.name}?`,
                  body: "Past orders keep it on their receipts.",
                  confirmLabel: "Delete",
                  danger: true,
                })
              )
                del.mutate({ id: combo.id });
            }}
            disabled={del.isPending}
            aria-label="Delete combo"
            className={iconBtn}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

type Part = { menuItemId: string; variantId: string | null; quantity: number };

// Pick items, name it, price it. The saving updates live so the owner sees
// exactly what the guest will see.
function ComboBuilder({
  combo,
  categories,
  currency,
  onClose,
}: {
  combo: ComboView | null;
  categories: MenuCategoryWithItems[];
  currency: string;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const done = { onSuccess: () => (toast.success(combo ? "Combo saved" : "Combo added"), onClose()) };
  const create = useMutation(trpc.menu.createCombo.mutationOptions(done));
  const update = useMutation(trpc.menu.updateCombo.mutationOptions(done));
  const pending = create.isPending || update.isPending;
  const error = (create.error ?? update.error)?.message;

  const [name, setName] = useState(combo?.name ?? "");
  const [description, setDescription] = useState(combo?.description ?? "");
  const [price, setPrice] = useState(combo?.price ?? "");
  const [parts, setParts] = useState<Part[]>(
    combo?.items.map(({ menuItemId, variantId, quantity }) => ({ menuItemId, variantId, quantity })) ?? [],
  );
  const [query, setQuery] = useState("");
  const money = (n: number | string) => formatMoney(n, currency);

  const items = useMemo(
    () => new Map(categories.flatMap((c) => c.items).map((it) => [it.id, it])),
    [categories],
  );
  const unitPrice = (p: Part) => {
    const it = items.get(p.menuItemId);
    const v = p.variantId ? it?.variants.find((x) => x.id === p.variantId) : null;
    return Number(v?.price ?? it?.price ?? 0);
  };
  const worth = r2(parts.reduce((s, p) => s + unitPrice(p) * p.quantity, 0));
  const priceN = Number(price) || 0;
  const { save, pct } = saving(worth, priceN);

  const q = query.trim().toLowerCase();
  const picker = categories
    .map((c) => ({ ...c, items: c.items.filter((it) => !q || it.name.toLowerCase().includes(q)) }))
    .filter((c) => c.items.length > 0);

  // Tapping an item again bumps its quantity instead of a duplicate row.
  function pick(itemId: string) {
    const it = items.get(itemId)!;
    const variantId = it.variants[0]?.id ?? null;
    setParts((ps) =>
      ps.some((p) => p.menuItemId === itemId && p.variantId === variantId)
        ? ps.map((p) => (p.menuItemId === itemId && p.variantId === variantId ? { ...p, quantity: Math.min(20, p.quantity + 1) } : p))
        : [...ps, { menuItemId: itemId, variantId, quantity: 1 }],
    );
  }
  const patch = (i: number, next: Partial<Part>) =>
    setParts((ps) => ps.map((p, j) => (j === i ? { ...p, ...next } : p)).filter((p) => p.quantity > 0));

  // "x% off" rounds down to a whole number — counter prices don't end in .37.
  const offer = (off: number) => setPrice(String(Math.floor(worth * (1 - off / 100))));

  function submit() {
    const input = { name, description, price: priceN, available: combo?.available ?? true, items: parts };
    if (combo) update.mutate({ ...input, id: combo.id });
    else create.mutate(input);
  }

  return (
    <Modal open onClose={onClose} maxWidth="max-w-4xl">
      <div className="rounded-t-fizz border border-ink-line bg-ink p-5 sm:rounded-fizz sm:p-8">
        <p className={labelCls}>{combo ? "Edit combo" : "New combo"}</p>
        <h2 className="mt-2 font-display text-[clamp(22px,3vw,30px)] font-bold tracking-tight">
          {name.trim() || "Build a combo"}
        </h2>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left: the item picker. */}
          <div className="flex min-w-0 flex-col gap-3">
            <span className={labelCls}>Add items</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the menu…"
              className={inputCls}
            />
            <div className="max-h-[22rem] overflow-y-auto rounded-fizz border border-ink-line">
              {picker.length === 0 ? (
                <p className="p-5 text-sm text-steam">No items match.</p>
              ) : (
                picker.map((c) => (
                  <div key={c.id}>
                    <p className="sticky top-0 border-b border-ink-line bg-ink px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-steam">
                      {c.icon} {c.name}
                    </p>
                    {c.items.map((it) => {
                      const n = parts.filter((p) => p.menuItemId === it.id).reduce((s, p) => s + p.quantity, 0);
                      return (
                        <button
                          key={it.id}
                          onClick={() => pick(it.id)}
                          className="flex w-full items-center justify-between gap-3 border-b border-ink-line px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-ink-soft"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-cream">{it.name}</span>
                            <span className="text-xs text-steam">
                              {it.variants.length > 0
                                ? it.variants.map((v) => `${v.name} ${money(v.price)}`).join(" · ")
                                : money(it.price)}
                            </span>
                          </span>
                          <span
                            className={`grid h-7 min-w-7 shrink-0 place-items-center rounded-full px-2 font-display text-sm font-bold ${
                              n ? "bg-fizz text-ink" : "border border-ink-line text-steam"
                            }`}
                          >
                            {n || "+"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: the combo as it'll sell. */}
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Burger Meal"
                maxLength={80}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className={labelCls}>Tagline (optional)</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Lunch sorted"
                maxLength={200}
                className={inputCls}
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className={labelCls}>In the combo</span>
              {parts.length === 0 ? (
                <p className="rounded-fizz border border-dashed border-ink-line p-4 text-sm text-steam">
                  Tap items on the left to add them.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-ink-line rounded-fizz border border-ink-line">
                  {parts.map((p, i) => {
                    const it = items.get(p.menuItemId);
                    return (
                      <li key={`${p.menuItemId}:${i}`} className="flex flex-col gap-2 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm text-cream">
                            {it?.name ?? "Item removed"}
                          </span>
                          <button onClick={() => patch(i, { quantity: p.quantity - 1 })} aria-label="One less" className="rounded-full border border-ink-line p-1 text-steam hover:border-fizz hover:text-fizz">
                            <MinusIcon className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center font-display text-sm font-bold">{p.quantity}</span>
                          <button onClick={() => patch(i, { quantity: Math.min(20, p.quantity + 1) })} aria-label="One more" className="rounded-full border border-ink-line p-1 text-steam hover:border-fizz hover:text-fizz">
                            <PlusIcon className="h-3 w-3" />
                          </button>
                          <span className="w-16 text-right font-display text-sm text-steam">
                            {money(unitPrice(p) * p.quantity)}
                          </span>
                        </div>
                        {it && it.variants.length > 0 && (
                          <select
                            value={p.variantId ?? ""}
                            onChange={(e) => patch(i, { variantId: e.target.value })}
                            className="rounded-fizz border border-ink-line bg-ink-soft px-3 py-1.5 text-sm text-cream outline-none focus:border-fizz"
                          >
                            {it.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name} · {money(v.price)}
                              </option>
                            ))}
                          </select>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-fizz border border-ink-line bg-ink-soft p-4">
              <div className="flex items-baseline justify-between text-sm text-steam">
                <span>Bought separately</span>
                <span className="font-display text-cream">{money(worth)}</span>
              </div>
              <label className="mt-3 flex flex-col gap-2">
                <span className={labelCls}>Combo price</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-steam">
                    {currencySymbol(currency)}
                  </span>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
                    inputMode="decimal"
                    placeholder="0"
                    className={`${inputCls} pl-9 font-display text-lg font-bold`}
                  />
                </div>
              </label>
              {worth > 0 && (
                <div className="mt-3 flex gap-2">
                  {[10, 15, 20].map((off) => (
                    <button
                      key={off}
                      onClick={() => offer(off)}
                      className="flex-1 rounded-full border border-ink-line px-3 py-1.5 text-xs font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
                    >
                      {off}% off
                    </button>
                  ))}
                </div>
              )}
              <p className={`mt-3 text-sm ${priceN > 0 && save <= 0 ? "text-[#E2655A]" : "text-steam"}`}>
                {priceN <= 0
                  ? "Set a price to see the saving."
                  : save > 0
                    ? (
                      <>
                        Guests save <span className="font-display font-bold text-fizz">{money(save)}</span> ({pct}%)
                      </>
                    )
                    : "No saving — it won't get a deal badge."}
              </p>
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-[#E2655A]">{error}</p>}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-ink-line pt-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
          >
            <CloseIcon className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !name.trim() || priceN <= 0 || parts.reduce((n, p) => n + p.quantity, 0) < 2}
            className="inline-flex items-center gap-2 rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
          >
            {pending ? "Saving…" : combo ? "Save combo" : "Add combo"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
