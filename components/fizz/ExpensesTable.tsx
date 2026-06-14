"use client";

import { useActionState } from "react";
import { deleteExpense, type ExpenseState } from "@/app/actions/expenses";
import { formatMoney } from "@/lib/store/format";
import type { ExpenseRow } from "@/lib/store/expenses";

const initial: ExpenseState = { ok: false };

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  online: "Online",
  credit: "Credit",
  other: "Other",
};

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d: Date | string): string {
  return new Date(d).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeleteButton({ id }: { id: string }) {
  const [, action, pending] = useActionState(deleteExpense, initial);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-ink-line px-3 py-1 text-xs font-semibold text-steam transition-colors hover:border-[#E2655A] hover:text-[#E2655A] disabled:opacity-50"
      >
        {pending ? "…" : "Delete"}
      </button>
    </form>
  );
}

export default function ExpensesTable({
  rows,
  currency,
  canDelete,
}: {
  rows: ExpenseRow[];
  currency: string;
  canDelete: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-fizz border border-ink-line bg-ink-soft p-10 text-center text-steam">
        No expenses recorded yet. Add the first one above.
      </div>
    );
  }

  const cls = "px-4 py-3 text-left";

  return (
    <div className="overflow-x-auto rounded-fizz border border-ink-line bg-ink-soft">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-line text-xs uppercase tracking-[0.14em] text-steam">
            <th className={cls}>Date</th>
            <th className={cls}>Category</th>
            <th className={cls}>Description</th>
            <th className={cls}>Vendor</th>
            <th className={cls}>Method</th>
            <th className={`${cls} text-right`}>Amount</th>
            <th className={cls}>Entered by</th>
            <th className={cls}>Created</th>
            {canDelete && <th className={`${cls} text-right`}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-ink-line/60 last:border-0">
              <td className={`${cls} font-medium text-cream`}>{fmtDate(r.expenseDate)}</td>
              <td className={cls}>
                <span className="rounded-full border border-ink-line px-2.5 py-0.5 text-xs text-cream">
                  {r.category}
                </span>
              </td>
              <td className={`${cls} text-steam`}>{r.description ?? "—"}</td>
              <td className={`${cls} text-steam`}>{r.vendor ?? "—"}</td>
              <td className={`${cls} text-steam`}>{METHOD_LABELS[r.paymentMethod]}</td>
              <td className={`${cls} text-right font-display font-semibold text-fizz`}>
                {formatMoney(r.amount, currency)}
              </td>
              <td className={`${cls} text-steam`}>{r.enteredByName ?? "—"}</td>
              <td className={`${cls} text-steam`}>{fmtDateTime(r.createdAt)}</td>
              {canDelete && (
                <td className={`${cls} text-right`}>
                  <DeleteButton id={r.id} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
