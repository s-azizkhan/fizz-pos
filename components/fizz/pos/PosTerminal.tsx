"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/store/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useTRPC } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/root";
import { toast } from "@/lib/store/toast";
import { isNetworkError, outbox } from "@/lib/store/outbox";
import { useCart } from "./useCart";
import type {
  LoadedOrder,
  OrderFees,
  OrderType,
  PaymentMethod,
  PosCategory,
  PosItem,
  TaxConfig,
  UpiConfig,
} from "./types";
import MenuGrid, { type MenuSection } from "./MenuGrid";
import Ticket from "./Ticket";
import VariantPicker from "./VariantPicker";
import PayModal from "./PayModal";
import FeesModal from "./FeesModal";
import ReceiptModal from "./ReceiptModal";
import { autoPrint, kotDelta, printToDefault } from "@/lib/print/print-order";
import { kot as kotTicket, receipt as receiptTicket } from "@/lib/print/templates";
import { usePrinter } from "@/lib/store/printer";
import KeyboardHints from "./KeyboardHints";
import type { Customer } from "./CustomerFields";
import type { OrderSource } from "@/lib/db/schema/constants";
import { stashedTab } from "./tab-stash";
import { orderShareText, waLink } from "@/lib/store/whatsapp";

// The point-of-sale terminal. Keyboard-first: a global search captures typing,
// arrow/number keys add items, and the ticket lives on the right. Built for a
// counter rush — every common action has a shortcut. When `loaded` is set the
// terminal is editing an existing open tab (revisited from the orders page).
//
// Offline: the Orders page navigates here with ?order=, and the worker answers
// with its cached POS — rendered with no tab (`requestedOrderId` null even
// though the URL names one). That mismatch is the tell: pick the tab up from
// the device instead. A live render that names the order but returns no tab
// means it isn't editable any more — never second-guess that.
type Props = Parameters<typeof Terminal>[0] & { requestedOrderId: string | null };

export default function PosTerminal({ requestedOrderId, ...props }: Props) {
  const [stash, setStash] = useState<LoadedOrder | null>(null);
  useEffect(() => {
    if (props.loaded || requestedOrderId) return;
    const id = new URLSearchParams(location.search).get("order");
    // Client-only source (sessionStorage), so it can't be read during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id) setStash(stashedTab(id));
  }, [props.loaded, requestedOrderId]);
  const loaded = props.loaded ?? stash;
  // Remount on pickup: every piece of terminal state seeds from `loaded`.
  return <Terminal key={loaded?.id ?? "new"} {...props} loaded={loaded} />;
}

function Terminal({
  categories,
  storeName,
  currency,
  tax,
  upi,
  cafeWhatsapp,
  loaded,
}: {
  categories: PosCategory[];
  storeName: string;
  currency: string;
  tax: TaxConfig;
  upi: UpiConfig | null;
  /** The café's WhatsApp number; lends its country code to customer links. */
  cafeWhatsapp: string | null;
  loaded: LoadedOrder | null;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  // handleSave toasts its own outcome (or queues offline); no global toast.
  const saveTab = useMutation(
    trpc.orders.save.mutationOptions({ meta: { silentError: true, noRefresh: true } }),
  );
  // The error renders in the pay modal, or the sale queues offline; either way
  // no global toast.
  const settle = useMutation(
    trpc.orders.checkout.mutationOptions({ meta: { silentError: true, noRefresh: true } }),
  );
  const queryClient = useQueryClient();
  // A brand-new customer was keyed in — pull them into the on-device book.
  const refreshBook = () => {
    if (!customer.id && (customer.name || customer.phone)) {
      void queryClient.invalidateQueries(trpc.customers.book.queryFilter());
    }
  };
  const hasPrinter = usePrinter((s) => !!s.deviceId);
  const cart = useCart(loaded?.lines ?? []);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>(categories[0]?.id ?? "");
  const [orderType, setOrderType] = useState<OrderType>(loaded?.type ?? "dine_in");
  const [reference, setReference] = useState(loaded?.reference ?? "");
  const [source, setSource] = useState<OrderSource>(loaded?.source ?? "counter");
  const [customer, setCustomer] = useState<Customer>({
    id: loaded?.customer?.id ?? null,
    name: loaded?.customer?.name ?? "",
    phone: loaded?.customer?.phone ?? "",
  });
  // Bumped on reset so the ticket's folded sections start closed again.
  const [ticketKey, setTicketKey] = useState(0);
  const NO_FEES: OrderFees = { service: 0, packaging: 0, delivery: 0 };
  const [fees, setFees] = useState<OrderFees>(loaded?.fees ?? NO_FEES);
  const [feesOpen, setFeesOpen] = useState(false);

  // The open tab being edited (if any) — drives "save" vs "create".
  const [editingId, setEditingId] = useState<string | null>(loaded?.id ?? null);
  const [editingNumber, setEditingNumber] = useState<string | null>(
    loaded?.number ?? null,
  );

  // Variant chooser for items with multiple sizes/options.
  const [variantFor, setVariantFor] = useState<PosItem | null>(null);
  // Payment + receipt flow.
  const [payOpen, setPayOpen] = useState(false);
  // The customer rides along so the receipt can offer "Share on WhatsApp"
  // after the terminal itself has been reset for the next order.
  const [receipt, setReceipt] = useState<
    | (inferRouterOutputs<AppRouter>["orders"]["checkout"] & {
        customer: { name: string; phone: string } | null;
      })
    | null
  >(null);
  // Mobile-only: the ticket lives in a slide-up sheet behind a bottom bar.
  const [cartOpen, setCartOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  // While a chip tap smooth-scrolls the grid, don't let scroll-spy flicker
  // the active chip through every section it passes.
  const jumpingRef = useRef(false);
  const money = (n: number | string) => formatMoney(n, currency);

  // What the kitchen already has a ticket for: a tab's lines as loaded — none
  // for a guest web order nobody has accepted yet.
  const kitchenHasSeen = loaded && !loaded.webPending ? loaded.lines : [];

  // Build the line payload from the cart for either save or checkout.
  const linePayload = () =>
    cart.lines.map((l) => ({
      menuItemId: l.menuItemId || null,
      variantId: l.variantId,
      name: l.name,
      variantName: l.variantName,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
    }));

  // Reset the terminal to a fresh order, clearing the ?order= param.
  function resetTerminal() {
    cart.clear();
    setReference("");
    setSource("counter");
    setCustomer({ id: null, name: "", phone: "" });
    setTicketKey((k) => k + 1);
    setOrderType("dine_in");
    setFees(NO_FEES);
    setEditingId(null);
    setEditingNumber(null);
    setCartOpen(false);
    if (loaded) router.replace("/dashboard/pos");
  }

  // Search → one untitled section of matches; otherwise every category
  // stacked into one continuous scroll.
  const sections = useMemo<MenuSection[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    const hits = categories
      .flatMap((c) => c.items)
      .filter((it) => it.name.toLowerCase().includes(q));
    return [{ id: "search", name: "", items: hits }];
  }, [query, categories]);

  // Items the 1-9 quick-add keys address: search hits, or the active section.
  const visibleItems = useMemo<PosItem[]>(
    () =>
      query.trim()
        ? sections[0].items
        : (categories.find((c) => c.id === activeCat)?.items ?? []),
    [query, sections, activeCat, categories],
  );

  // Scroll-spy: the active category is the last section whose top has passed
  // the top of the grid (or the last one once scrolled to the bottom).
  function spy() {
    const grid = gridRef.current;
    if (!grid || query || jumpingRef.current) return;
    const secs = grid.querySelectorAll<HTMLElement>("[data-cat]");
    let id = secs[0]?.dataset.cat;
    const atBottom = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 2;
    for (const el of secs) {
      if (atBottom || el.offsetTop - grid.scrollTop <= 24) id = el.dataset.cat;
    }
    if (id && id !== activeCat) setActiveCat(id);
  }

  // Chip tap: smooth-scroll the grid to that category's section.
  function jumpTo(id: string) {
    setActiveCat(id);
    jumpingRef.current = true;
    gridRef.current?.addEventListener(
      "scrollend",
      () => {
        jumpingRef.current = false;
      },
      { once: true },
    );
    // ponytail: fallback for browsers without `scrollend` (older Safari).
    setTimeout(() => (jumpingRef.current = false), 800);
    document.getElementById(`pos-cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Keep the active chip centred in the horizontal chip rail.
  useEffect(() => {
    const rail = chipsRef.current;
    const chip = rail?.querySelector<HTMLElement>(`[data-chip="${activeCat}"]`);
    if (!rail || !chip) return;
    rail.scrollTo({
      left: chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2,
      behavior: "smooth",
    });
  }, [activeCat]);

  // Add an item; open the variant picker first if it has variants.
  function addItem(item: PosItem) {
    if (item.variants.length > 0) {
      setVariantFor(item);
      return;
    }
    cart.add(item, null);
  }

  // Network down: bank the sale (or tab update) on the device, still fire the
  // kitchen ticket, and keep ringing. Replays are safe: clientId dedupes a new
  // sale, and an existing tab is re-checked server-side — if someone settled it
  // elsewhere meanwhile, the replay is rejected and flagged in the outbox.
  // ponytail: a queued tab update is last-write-wins against edits made on
  // another device in the meantime.
  function queueOffline(
    sale: Parameters<typeof outbox.add>[0],
    fresh: ReturnType<typeof kotDelta>,
  ) {
    outbox.add(sale);
    setPayOpen(false);
    toast.info("Offline — saved on this device, syncs when you're back");
    // The real number arrives on sync; the kitchen just needs the lines.
    if (usePrinter.getState().autoKot && fresh.length > 0) {
      autoPrint("KOT", (cfg) =>
        kotTicket(
          {
            storeName,
            // An existing tab keeps its number; a new sale gets its real one on sync.
            orderNumber: editingNumber ?? `OFF-${sale.input.clientId.slice(0, 4).toUpperCase()}`,
            type: orderType,
            reference: reference || null,
            createdAt: new Date(),
            addOn: kitchenHasSeen.length > 0,
            items: fresh,
          },
          cfg,
        ),
      );
    }
    resetTerminal();
  }

  // Save the current cart as an OPEN tab (no payment). Used for dine-in: ring
  // dishes, save, settle later — and to add dishes mid-meal without a new order.
  async function handleSave() {
    if (cart.lines.length === 0 || saveTab.isPending) return;
    // Only what the kitchen hasn't seen: the cart minus the tab as loaded.
    const fresh = kotDelta(cart.lines, kitchenHasSeen);
    const tab = {
      orderId: editingId ?? undefined,
      type: orderType,
      reference,
      source,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      discount: loaded?.discount ?? 0,
      fees,
      items: linePayload(),
      clientId: crypto.randomUUID(),
      soldAt: new Date(),
    };
    try {
      const res = await saveTab.mutateAsync(tab);
      // Tab is saved — clear the terminal so the next order can be rung right
      // away. Revisit/settle the saved tab from the orders page.
      toast.success(`Saved tab ${res.orderNumber} — ready for the next order`);
      refreshBook();
      if (usePrinter.getState().autoKot && fresh.length > 0) {
        autoPrint("KOT", (cfg) =>
          kotTicket(
            {
              storeName,
              orderNumber: res.orderNumber,
              type: orderType,
              reference: reference || null,
              createdAt: new Date(),
              addOn: kitchenHasSeen.length > 0,
              items: fresh,
            },
            cfg,
          ),
        );
      }
      resetTerminal();
    } catch (e) {
      if (isNetworkError(e)) return queueOffline({ kind: "save", input: tab }, fresh);
      toast.error(e instanceof Error ? e.message : "Couldn't save the tab");
    }
  }

  // Takeaway has nothing to reference — drop any table/address left behind.
  function changeOrderType(t: OrderType) {
    setOrderType(t);
    if (t === "takeaway") setReference("");
    // Delivery fee only belongs on a delivery order.
    if (t !== "delivery") setFees((f) => ({ ...f, delivery: 0 }));
  }

  // Global keyboard handling. Typing focuses search; shortcuts drive the POS.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const anyModalOpen = payOpen || receipt || variantFor || feesOpen;
      const target = e.target as HTMLElement;
      const inField =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // Escape: close pickers / clear search.
      if (e.key === "Escape") {
        if (feesOpen) return setFeesOpen(false);
        if (variantFor) return setVariantFor(null);
        if (payOpen) return setPayOpen(false);
        if (query) return setQuery("");
        return;
      }

      // Let modals own their own keys.
      if (anyModalOpen) return;

      // F4: save the current cart as an open tab.
      if (e.key === "F4" && cart.count > 0) {
        e.preventDefault();
        void handleSave();
        return;
      }

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

      // Shift+I / Shift+T / Shift+D: switch the order type.
      if (!inField && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        const t =
          e.code === "KeyI"
            ? "dine_in"
            : e.code === "KeyT"
              ? "takeaway"
              : e.code === "KeyD"
                ? "delivery"
                : null;
        if (t) {
          e.preventDefault();
          changeOrderType(t);
          return;
        }
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
  }, [payOpen, receipt, variantFor, feesOpen, query, cart.count, visibleItems]);

  // Focus search on mount for instant typing — but only where there's a real
  // pointer (mouse/trackpad = a keyboard too). On a touch POS, autofocus
  // throws up the on-screen keyboard over the menu grid before anyone asks.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();
  }, []);

  async function handlePay(input: {
    paymentMethod: PaymentMethod;
    discount: number;
    tendered?: number;
  }) {
    // Re-entry guard. `nextOrderNumber()` increments the store row outside the
    // transaction, so a double-fire settles two orders, burns two order
    // numbers, and deducts stock twice. handleSave has always had this; this
    // path never did.
    if (cart.lines.length === 0 || settle.isPending) return;
    const fresh = kotDelta(cart.lines, kitchenHasSeen);
    const sale = {
      orderId: editingId ?? undefined,
      type: orderType,
      reference,
      source,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      paymentMethod: input.paymentMethod,
      discount: input.discount,
      fees,
      tendered: input.tendered,
      items: linePayload(),
      // Idempotency key: lets the outbox replay this sale without doubling it.
      clientId: crypto.randomUUID(),
      soldAt: new Date(),
    };
    try {
      const res = await settle.mutateAsync(sale);
      setPayOpen(false);
      setReceipt({
        ...res,
        customer: customer.phone ? { name: customer.name, phone: customer.phone } : null,
      });
      toast.success("Order settled");
      refreshBook();
      // Receipt first (the customer is waiting), then the kitchen's lines.
      const { autoReceipt, autoKot } = usePrinter.getState();
      if (autoReceipt) autoPrint("Receipt", (cfg) => receiptTicket(res, cfg));
      if (autoKot && fresh.length > 0) {
        autoPrint("KOT", (cfg) =>
          kotTicket(
            {
              storeName: res.store.name,
              orderNumber: res.orderNumber,
              type: res.type,
              reference: res.reference,
              createdAt: res.createdAt,
              addOn: kitchenHasSeen.length > 0,
              items: fresh,
            },
            cfg,
          ),
        );
      }
      resetTerminal();
    } catch (e) {
      if (isNetworkError(e)) {
        queueOffline({ kind: "checkout", input: sale }, fresh);
        return;
      }
      // Surface the error inside the pay modal.
      return e instanceof Error ? e.message : "Something fizzled at the POS.";
    }
  }

  // Manual reprint from the success modal.
  function printReceipt(r: NonNullable<typeof receipt>) {
    printToDefault((cfg) => receiptTicket(r, cfg), { interactive: true }).then(
      () => toast.success("Receipt sent to printer"),
      (e) => toast.error(e instanceof Error ? e.message : "Print fizzled"),
    );
  }

  return (
    <div className="flex h-[calc(100dvh-64px)] min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_380px]">
        {/* Menu side */}
        <div className="flex min-h-0 flex-col border-ink-line lg:border-r">
          <header className="shrink-0 border-b border-ink-line px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
                POS ●
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
                  className="w-full rounded-fizz border border-ink-line bg-ink-soft py-2.5 pl-10 pr-10 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-steam transition-colors hover:text-fizz"
                  >
                    ✕
                  </button>
                )}
              </div>
              <a
                href="/dashboard/orders"
                className="hidden shrink-0 rounded-fizz border border-ink-line bg-ink-soft px-4 py-2.5 text-sm text-cream transition-colors hover:border-fizz hover:text-fizz sm:block"
              >
                Orders
              </a>
            </div>

            {/* Category tabs (hidden while searching) */}
            {!query && (
              <div ref={chipsRef} className="relative mt-3 flex gap-2 overflow-x-auto pb-1">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    data-chip={c.id}
                    onClick={() => jumpTo(c.id)}
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

          <MenuGrid
            ref={gridRef}
            sections={sections}
            activeId={activeCat}
            onScroll={spy}
            onAdd={addItem}
            money={money}
            empty={query ? "No matches." : "Nothing on the menu yet."}
          />
          <KeyboardHints />
        </div>

        {/* Ticket side — right column on desktop, slide-up sheet on mobile */}
        <div
          className={[
            // Desktop: in-flow right column.
            "lg:relative lg:z-auto lg:flex lg:min-h-0 lg:translate-y-0",
            // Mobile: fixed full-height sheet that slides up.
            // Mobile sheet sits above the floating tab bar while it is open.
            "fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col transition-transform duration-300 ease-out lg:inset-auto",
            cartOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0",
          ].join(" ")}
        >
          <Ticket
            key={ticketKey}
            lines={cart.lines}
            subtotal={cart.subtotal}
            count={cart.count}
            money={money}
            orderType={orderType}
            onOrderType={changeOrderType}
            reference={reference}
            onReference={setReference}
            source={source}
            onSource={setSource}
            customer={customer}
            onCustomer={setCustomer}
            fees={fees}
            onOpenFees={() => setFeesOpen(true)}
            editingNumber={editingNumber}
            saving={saveTab.isPending}
            onInc={cart.inc}
            onDec={cart.dec}
            onRemove={cart.remove}
            onClear={resetTerminal}
            onSave={handleSave}
            onPay={() => setPayOpen(true)}
            onCloseMobile={() => setCartOpen(false)}
          />
        </div>
      </div>

      {/* Mobile: floating cart pill, stacked just above the tab bar. */}
      {cart.count > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-full bg-fizz px-5 py-3.5 font-display font-bold text-ink shadow-[0_10px_30px_rgba(14,17,22,0.6)] transition-transform hover:scale-[1.02] lg:hidden"
        >
          <span className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-ink/15 text-sm">
              {cart.count}
            </span>
            View order
          </span>
          <span className="text-lg">{money(cart.subtotal)}</span>
        </button>
      )}

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
          fees={fees}
          tax={tax}
          upi={upi}
          money={money}
          customer={customer}
          onCustomer={setCustomer}
          submitting={settle.isPending}
          onPay={handlePay}
          onClose={() => setPayOpen(false)}
        />
      )}

      <FeesModal
        open={feesOpen}
        fees={fees}
        orderType={orderType}
        money={money}
        onSave={setFees}
        onClose={() => setFeesOpen(false)}
      />

      {receipt && (
        <ReceiptModal
          orderNumber={receipt.orderNumber}
          subtotal={money(receipt.subtotal)}
          discount={Number(receipt.discount) > 0 ? money(receipt.discount) : null}
          tax={Number(receipt.tax) > 0 ? money(receipt.tax) : null}
          taxLabel={receipt.taxLabel}
          fees={receipt.fees}
          total={money(receipt.total)}
          changeDue={receipt.changeDue ? money(receipt.changeDue) : null}
          onClose={() => setReceipt(null)}
          onPrint={hasPrinter ? () => printReceipt(receipt) : undefined}
          shareHref={
            receipt.customer
              ? waLink(
                  receipt.customer.phone,
                  cafeWhatsapp,
                  orderShareText({
                    storeName,
                    orderNumber: receipt.orderNumber,
                    customerName: receipt.customer.name || null,
                    lines: receipt.lines,
                    total: receipt.total,
                    paid: true,
                    currency,
                  }),
                )
              : undefined
          }
        />
      )}

    </div>
  );
}
