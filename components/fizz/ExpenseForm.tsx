"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createExpense, type ExpenseState } from "@/app/actions/expenses";
import { EXPENSE_CATEGORIES, expenseMethod } from "@/lib/db/schema";
import { formatMoney } from "@/lib/store/format";

const initial: ExpenseState = { ok: false };

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  online: "Online",
  credit: "Credit",
  other: "Other",
};

function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function ExpenseForm({
  currency,
  onSuccess,
}: {
  currency: string;
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState(createExpense, initial);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (state.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaved(true);
      formRef.current?.reset();
      setAmount("");
      onSuccess?.();
      const t = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state.ok, onSuccess]);

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-fizz border border-ink-line bg-ink-soft p-7"
    >
      <h2 className="font-display text-xl font-bold tracking-tight">
        Record an expense
      </h2>
      <p className="mt-1 text-sm text-steam">
        Track what you spent, where it went, and how it was paid.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Expense date</span>
          <input
            name="expenseDate"
            type="date"
            required
            defaultValue={todayLocal()}
            max={todayLocal()}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Amount</span>
          <input
            name="amount"
            type="number"
            min={0.01}
            step="0.01"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Category</span>
          <select name="category" required defaultValue="Other" className={`${inputCls} appearance-none`}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-ink-soft text-cream">
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Payment method</span>
          <select name="paymentMethod" required defaultValue="cash" className={`${inputCls} appearance-none`}>
            {expenseMethod.enumValues.map((m) => (
              <option key={m} value={m} className="bg-ink-soft text-cream">
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelCls}>Vendor</span>
          <input name="vendor" placeholder="Who you paid" className={inputCls} />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className={labelCls}>Description</span>
          <input name="description" placeholder="What it was for" className={inputCls} />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="rounded-fizz border border-fizz/40 bg-fizz/5 px-4 py-3">
          <span className={labelCls}>Amount</span>
          <p className="mt-1 font-display text-lg font-semibold text-fizz">
            {formatMoney(amount, currency)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {saved && <span className="text-sm font-semibold text-fizz">Saved ●</span>}
          {state.error && (
            <span className="text-sm text-[#E2655A]">{state.error}</span>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-fizz bg-fizz px-6 py-3 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Record expense"}
          </button>
        </div>
      </div>
    </form>
  );
}
