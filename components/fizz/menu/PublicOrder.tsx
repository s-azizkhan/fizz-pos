"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { formatMoney } from "@/lib/store/format";

// Cart for the public menu. Module-level zustand store so the per-item add
// buttons (rendered inside the server page) and the floating cart share state
// without threading a provider through the server tree.
// ponytail: not persisted — a café menu cart is a one-sitting thing.
export type CartLine = { key: string; name: string; price: number; qty: number };

type CartState = {
  lines: CartLine[];
  open: boolean;
  add: (line: Omit<CartLine, "qty">) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  setOpen: (v: boolean) => void;
};

const useCart = create<CartState>((set) => ({
  lines: [],
  open: false,
  add: (line) =>
    set((s) => ({
      lines: s.lines.some((l) => l.key === line.key)
        ? s.lines.map((l) => (l.key === line.key ? { ...l, qty: l.qty + 1 } : l))
        : [...s.lines, { ...line, qty: 1 }],
    })),
  setQty: (key, qty) =>
    set((s) => ({
      lines: qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, qty } : l)),
    })),
  clear: () => set({ lines: [], open: false }),
  setOpen: (v) => set({ open: v }),
}));

// Accent color is store-chosen (a theme suggests one, the café can override),
// so button labels pick black or white by luminance instead of assuming dark.
export function contrastOn(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#0E1116";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.45 ? "#0E1116" : "#FFFFFF";
}

const total = (lines: CartLine[]) => lines.reduce((n, l) => n + l.price * l.qty, 0);
const count = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);

// The message a visitor sends. Plain text — WhatsApp renders *bold*.
const RULE = "--------------------------";

export function orderMessage({
  lines,
  currency,
  mode,
  name,
  note,
  address,
  deliveryFee,
  packagingFee,
}: {
  lines: CartLine[];
  currency: string;
  mode: string;
  name: string;
  note: string;
  address: string;
  deliveryFee: number;
  packagingFee: number;
}): string {
  // Whole amounts read cleaner without ".00" in a chat message.
  const m = (n: number) => formatMoney(n, currency).replace(/\.00$/, "");
  const units = count(lines);
  const packaging = packagingFee * units;

  const out = [
    `*NEW ORDER: ${mode.toUpperCase()}*`,
    RULE,
    // Bold on the parts the café acts on: what, how many, how much.
    ...lines.map((l) => `• *${l.name}* [x${l.qty}] = *${m(l.price * l.qty)}*`),
    RULE,
  ];
  if (packaging > 0) out.push(`Packaging (${m(packagingFee)} x ${units}): ${m(packaging)}`);
  if (deliveryFee > 0) out.push(`Delivery: ${m(deliveryFee)}`);
  if (packaging > 0 || deliveryFee > 0) out.push(RULE);
  out.push(
    `*TOTAL BILL: ${m(total(lines) + packaging + deliveryFee)}*`,
    `*SERVICE:* ${mode}`,
    "",
    "*MY DETAILS:*",
  );
  if (address.trim()) out.push(`*Address:* ${address.trim()}`);
  out.push(`*Name:* ${name.trim()}`);
  if (note.trim()) out.push(`*Note:* ${note.trim()}`);
  return out.join("\n");
}

// ---- Per-item control: a "+" that becomes a stepper once in the cart ------
export function AddToCart({
  itemKey,
  name,
  price,
  accent,
}: {
  itemKey: string;
  name: string;
  price: string | number;
  accent: string;
}) {
  const line = useCart((s) => s.lines.find((l) => l.key === itemKey));
  const { add, setQty } = useCart();
  const qty = line?.qty ?? 0;

  if (!qty) {
    return (
      <button
        type="button"
        aria-label={`Add ${name}`}
        onClick={() => add({ key: itemKey, name, price: Number(price) })}
        className="grid size-8 shrink-0 place-items-center rounded-full border text-[1em] font-bold leading-none transition-transform hover:scale-110 active:scale-95"
        style={{ borderColor: accent, color: accent }}
      >
        +
      </button>
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-1 py-1"
      style={{ backgroundColor: accent, color: contrastOn(accent) }}
    >
      <button
        type="button"
        aria-label={`Remove one ${name}`}
        onClick={() => setQty(itemKey, qty - 1)}
        className="grid size-6 place-items-center rounded-full text-[0.9em] font-bold leading-none hover:bg-black/10"
      >
        −
      </button>
      <span className="min-w-4 text-center text-[0.8em] font-bold tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label={`Add one ${name}`}
        onClick={() => setQty(itemKey, qty + 1)}
        className="grid size-6 place-items-center rounded-full text-[0.9em] font-bold leading-none hover:bg-black/10"
      >
        +
      </button>
    </span>
  );
}

// ---- Floating cart pill + order sheet -------------------------------------
export function FloatingCart({
  storeName,
  whatsapp,
  currency,
  accent,
  modes,
  deliveryFee,
  packagingFee,
}: {
  storeName: string;
  whatsapp: string;
  currency: string;
  accent: string;
  /** Fulfilment modes the café offers, in display order. Never empty. */
  modes: string[];
  deliveryFee: number;
  packagingFee: number;
}) {
  const { lines, open, setOpen, clear } = useCart();
  const [mode, setMode] = useState<string>(modes[0]);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const [sent, setSent] = useState(false);
  const n = count(lines);
  const isDelivery = mode === "Delivery";
  const fee = isDelivery ? deliveryFee : 0;
  // Packaging is charged on anything leaving the café, not on dine-in.
  const packaging = mode === "Dine-in" ? 0 : packagingFee * n;
  const due = total(lines) + packaging + fee;
  // An address is the one thing a delivery order can't be sent without.
  const blocked = isDelivery && address.trim().length < 8;

  // Sheet open = page behind must not scroll.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!n && !sent) return null;

  const send = () => {
    if (blocked) return;
    const text = orderMessage({
      lines,
      currency,
      mode,
      name,
      note,
      address: isDelivery ? address : "",
      deliveryFee: fee,
      packagingFee: mode === "Dine-in" ? 0 : packagingFee,
    });
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    setSent(true);
    clear();
  };

  return (
    <>
      {/* Pill */}
      {!open && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => (sent ? setSent(false) : setOpen(true))}
            className="fizz-toast flex w-full max-w-md items-center justify-between gap-4 rounded-full px-5 py-3.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.55)] transition-transform hover:scale-[1.02] active:scale-95"
            style={{ backgroundColor: accent, color: contrastOn(accent) }}
          >
            {sent ? (
              <span className="w-full text-center text-[0.95em] font-bold">Order sent ●  Start another</span>
            ) : (
              <>
                <span className="flex items-center gap-2.5 text-[0.95em] font-bold">
                  <span
                    className="grid size-6 place-items-center rounded-full text-[0.75em] tabular-nums"
                    style={{ backgroundColor: contrastOn(accent), color: accent }}
                  >
                    {n}
                  </span>
                  View order
                </span>
                <span className="text-[0.95em] font-bold tabular-nums">
                  {formatMoney(due, currency)}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close order"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Your order"
            className="fizz-sheet relative flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-[24px] border border-[var(--m-line)] bg-[var(--m-surface)] text-[var(--m-text)] sm:rounded-[var(--m-radius)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--m-line)] px-6 py-5">
              <div>
                <p
                  className="text-[0.7em] font-semibold uppercase tracking-[0.3em]"
                  style={{ color: accent }}
                >
                  Your order
                </p>
                <h2 className="mt-1 text-[1.3em] font-bold tracking-tight">{storeName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid size-9 place-items-center rounded-full border border-[var(--m-line)] text-[var(--m-muted)] hover:opacity-70"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <ul className="flex flex-col divide-y divide-[var(--m-line)]">
                {lines.map((l) => (
                  <li key={l.key} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[0.95em] font-semibold">{l.name}</p>
                      <p className="text-[0.8em] text-[var(--m-muted)]">{formatMoney(l.price, currency)} each</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <AddToCart itemKey={l.key} name={l.name} price={l.price} accent={accent} />
                      <span className="w-16 shrink-0 text-right text-[0.95em] font-semibold tabular-nums">
                        {formatMoney(l.price * l.qty, currency)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex gap-2">
                {modes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className="flex-1 rounded-full border px-4 py-2.5 text-[0.85em] font-semibold transition-colors"
                    style={
                      mode === m
                        ? { backgroundColor: accent, borderColor: accent, color: contrastOn(accent) }
                        : { borderColor: "var(--m-line)", color: "var(--m-muted)" }
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3">
                {isDelivery && (
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Delivery address — house, street, landmark"
                    aria-label="Delivery address"
                    rows={2}
                    maxLength={300}
                    required
                    className="resize-none rounded-[var(--m-radius)] border border-[var(--m-line)] bg-[var(--m-bg)] px-4 py-3 text-[0.95em] text-[var(--m-text)] outline-none placeholder:text-[var(--m-muted)] focus:border-[color:var(--m-accent)]"
                  />
                )}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  aria-label="Your name"
                  maxLength={60}
                  className="rounded-[var(--m-radius)] border border-[var(--m-line)] bg-[var(--m-bg)] px-4 py-3 text-[0.95em] text-[var(--m-text)] outline-none placeholder:text-[var(--m-muted)] focus:border-[color:var(--m-accent)]"
                />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything else? Table number, less sugar…"
                  aria-label="Order note"
                  rows={2}
                  maxLength={300}
                  className="resize-none rounded-[var(--m-radius)] border border-[var(--m-line)] bg-[var(--m-bg)] px-4 py-3 text-[0.95em] text-[var(--m-text)] outline-none placeholder:text-[var(--m-muted)] focus:border-[color:var(--m-accent)]"
                />
              </div>
            </div>

            <div className="border-t border-[var(--m-line)] px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
              {(fee > 0 || packaging > 0) && (
                <div className="mb-2 flex flex-col gap-1 text-[0.85em] text-[var(--m-muted)]">
                  <span className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatMoney(total(lines), currency)}</span>
                  </span>
                  {packaging > 0 && (
                    <span className="flex justify-between">
                      <span>Packaging</span>
                      <span className="tabular-nums">{formatMoney(packaging, currency)}</span>
                    </span>
                  )}
                  {fee > 0 && (
                    <span className="flex justify-between">
                      <span>Delivery</span>
                      <span className="tabular-nums">{formatMoney(fee, currency)}</span>
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between text-[1.05em] font-bold">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(due, currency)}</span>
              </div>
              <button
                type="button"
                onClick={send}
                disabled={blocked}
                className="mt-4 w-full rounded-[var(--m-radius)] py-3.5 text-[1em] font-bold transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: accent, color: contrastOn(accent) }}
              >
                {blocked ? "Add a delivery address" : "Send order on WhatsApp"}
              </button>
              <p className="mt-3 text-center text-[0.75em] text-[var(--m-muted)]">
                Opens WhatsApp with your order typed out. Hit send — we&apos;ll confirm there.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
