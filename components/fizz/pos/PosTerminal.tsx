"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "@/lib/store/format";
import { checkout, type CheckoutResult } from "@/app/actions/order";
import { useCart } from "./useCart";
import type { OrderType, PaymentMethod, PosCategory, PosItem } from "./types";
import MenuGrid from "./MenuGrid";
import Ticket from "./Ticket";
import VariantPicker from "./VariantPicker";
import PayModal from "./PayModal";
import ReceiptModal from "./ReceiptModal";
import KeyboardHints from "./KeyboardHints";

// The point-of-sale terminal. Keyboard-first: a global search captures typing,
// arrow/number keys add items, and the ticket lives on the right. Built for a
// counter rush — every common action has a shortcut.
export default function PosTerminal({
  categories,
  currency,
}: {
  categories: PosCategory[];
  currency: string;
}) {
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>(categories[0]?.id ?? "");
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [reference, setReference] = useState("");

  // Variant chooser for items with multiple sizes/options.
  const [variantFor, setVariantFor] = useState<PosItem | null>(null);
  // Payment + receipt flow.
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState<
    (CheckoutResult & { ok: true }) | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const money = (n: number | string) => formatMoney(n, currency);

  // Visible items: search across all categories, else show the active tab.
  const visibleItems = useMemo<PosItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return categories
        .flatMap((c) => c.items)
        .filter((it) => it.name.toLowerCase().includes(q));
    }
    return categories.find((c) => c.id === activeCat)?.items ?? [];
  }, [query, activeCat, categories]);

  // Add an item; open the variant picker first if it has variants.
  function addItem(item: PosItem) {
    if (item.variants.length > 0) {
      setVariantFor(item);
      return;
    }
    cart.add(item, null);
  }

  // Global keyboard handling. Typing focuses search; shortcuts drive the till.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const anyModalOpen = payOpen || receipt || variantFor;
      const target = e.target as HTMLElement;
      const inField =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // Escape: close pickers / clear search.
      if (e.key === "Escape") {
        if (variantFor) return setVariantFor(null);
        if (payOpen) return setPayOpen(false);
        if (query) return setQuery("");
        return;
      }

      // Let modals own their own keys.
      if (anyModalOpen) return;

      // F2 / Enter (outside fields): open payment if the cart has items.
      if ((e.key === "F2" || (e.key === "Enter" && !inField)) && cart.count > 0) {
        e.preventDefault();
        setPayOpen(true);
        return;
      }

      // Ctrl/Cmd+Backspace: clear the whole ticket.
      if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") {
        e.preventDefault();
        cart.clear();
        return;
      }

      // 1-9 while not typing: quick-add the Nth visible item.
      if (!inField && /^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        const it = visibleItems[idx];
        if (it) {
          e.preventDefault();
          addItem(it);
        }
        return;
      }

      // Any printable char: jump into search.
      if (!inField && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payOpen, receipt, variantFor, query, cart.count, visibleItems]);

  // Focus search on mount for instant typing.
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  async function handlePay(input: {
    paymentMethod: PaymentMethod;
    discount: number;
    tendered?: number;
  }) {
    if (cart.lines.length === 0) return;
    setSubmitting(true);
    const res = await checkout({
      type: orderType,
      reference,
      paymentMethod: input.paymentMethod,
      discount: input.discount,
      tendered: input.tendered,
      items: cart.lines.map((l) => ({
        menuItemId: l.menuItemId,
        variantId: l.variantId,
        name: l.name,
        variantName: l.variantName,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
      })),
    });
    setSubmitting(false);
    if (res.ok) {
      setPayOpen(false);
      setReceipt(res);
      cart.clear();
      setReference("");
    } else {
      // Surface the error inside the pay modal.
      return res.error;
    }
  }

  return (
    <div className="flex h-[calc(100dvh-64px)] min-h-0 flex-col lg:h-screen">
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_380px]">
        {/* Menu side */}
        <div className="flex min-h-0 flex-col border-ink-line lg:border-r">
          <header className="shrink-0 border-b border-ink-line px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
                Till ●
              </span>
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-steam">
                  ⌕
                </span>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the menu — just start typing"
                  className="w-full rounded-fizz border border-ink-line bg-ink-soft py-2.5 pl-10 pr-4 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
                />
              </div>
            </div>

            {/* Category tabs (hidden while searching) */}
            {!query && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCat(c.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                      c.id === activeCat
                        ? "border-fizz bg-fizz text-ink"
                        : "border-ink-line bg-ink-soft text-cream hover:border-fizz"
                    }`}
                  >
                    <span aria-hidden>{c.icon}</span>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </header>

          <MenuGrid items={visibleItems} onAdd={addItem} money={money} empty={query ? "No matches." : "Nothing on this tab yet."} />
          <KeyboardHints />
        </div>

        {/* Ticket side */}
        <Ticket
          lines={cart.lines}
          subtotal={cart.subtotal}
          count={cart.count}
          money={money}
          orderType={orderType}
          onOrderType={setOrderType}
          reference={reference}
          onReference={setReference}
          onInc={cart.inc}
          onDec={cart.dec}
          onRemove={cart.remove}
          onClear={cart.clear}
          onPay={() => setPayOpen(true)}
        />
      </div>

      {variantFor && (
        <VariantPicker
          item={variantFor}
          money={money}
          onPick={(variant) => {
            cart.add(variantFor, variant);
            setVariantFor(null);
          }}
          onClose={() => setVariantFor(null)}
        />
      )}

      {payOpen && (
        <PayModal
          subtotal={cart.subtotal}
          money={money}
          submitting={submitting}
          onPay={handlePay}
          onClose={() => setPayOpen(false)}
        />
      )}

      {receipt && (
        <ReceiptModal
          orderNumber={receipt.orderNumber}
          total={money(receipt.total)}
          changeDue={receipt.changeDue ? money(receipt.changeDue) : null}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
