"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import { matchCustomer, type CustomerLite } from "@/lib/store/customer-match";

// The customer book lives on the device: last copy from localStorage paints
// instantly (and works offline), then one background fetch refreshes it.
const BOOK_KEY = "fizz-customer-book";
function savedBook(): CustomerLite[] | undefined {
  try {
    return JSON.parse(localStorage.getItem(BOOK_KEY) ?? "null") ?? undefined;
  } catch {
    return undefined;
  }
}

export function useCustomerBook() {
  const trpc = useTRPC();
  const { data } = useQuery({
    ...trpc.customers.book.queryOptions(),
    initialData: savedBook,
    initialDataUpdatedAt: 0, // treat the saved copy as stale → refresh once
    staleTime: 5 * 60_000,
  });
  useEffect(() => {
    try {
      if (data) localStorage.setItem(BOOK_KEY, JSON.stringify(data));
    } catch {
      // Storage full / blocked — the in-memory copy still works.
    }
  }, [data]);
  return data ?? [];
}

// `id` is set once picked from the café's customer book; null = new / unknown
// (the server matches it by phone, or creates it, when the order lands).
export type Customer = { id: string | null; name: string; phone: string };

// Optional customer name + phone, folded behind a chip until asked for. Typing
// in either field searches the café's regulars; pick one to link the order.
// Always starts folded; the chip shows who's linked when there's a customer.
export default function CustomerFields({
  value,
  onChange,
  inputClass = "bg-ink-soft",
}: {
  value: Customer;
  onChange: (c: Customer) => void;
  inputClass?: string;
}) {
  const book = useCustomerBook();
  const filled = !!(value.id || value.name || value.phone);
  const [open, setOpen] = useState(false);
  // Whatever field was typed in last drives the lookup — searched locally.
  const [typed, setTyped] = useState("");
  const q = typed.trim();
  const matches = useMemo(
    () => (value.id || q.length < 2 ? [] : book.filter((c) => matchCustomer(c, q)).slice(0, 8)),
    [book, q, value.id],
  );
  const showMatches = matches.length > 0;

  const field = `w-full rounded-fizz border border-ink-line px-3 py-2 text-sm text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40 ${inputClass}`;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-ink-line bg-ink-soft px-3 py-1 text-xs text-steam transition-colors hover:border-fizz hover:text-fizz"
      >
        {filled ? `Customer · ${value.name || value.phone}` : "＋ Customer"}
      </button>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-[0.18em] text-steam">
          Customer
          {value.id && <span className="ml-2 normal-case tracking-normal text-bubble">● Regular</span>}
        </span>
        <span className="flex gap-3">
          {value.id && (
            <button
              type="button"
              onClick={() => onChange({ id: null, name: "", phone: "" })}
              className="text-xs text-steam transition-colors hover:text-[#E2655A]"
            >
              Unlink
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-steam transition-colors hover:text-fizz"
          >
            Hide
          </button>
        </span>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <input
          value={value.name}
          onChange={(e) => {
            onChange({ ...value, name: e.target.value });
            setTyped(e.target.value);
          }}
          placeholder="Name"
          maxLength={80}
          autoComplete="off"
          className={field}
        />
        <input
          value={value.phone}
          onChange={(e) => {
            const phone = e.target.value.replace(/[^0-9+\- ]/g, "");
            onChange({ ...value, phone });
            setTyped(phone);
          }}
          placeholder="Phone"
          type="tel"
          inputMode="tel"
          maxLength={20}
          autoComplete="off"
          className={field}
        />
      </div>
      {showMatches && (
        <ul className="mt-1 overflow-hidden rounded-fizz border border-ink-line bg-ink">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ id: c.id, name: c.name ?? "", phone: c.phone ?? "" });
                  setTyped("");
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-fizz/10"
              >
                <span className="truncate text-cream">{c.name || "No name"}</span>
                <span className="shrink-0 font-display text-steam">{c.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
