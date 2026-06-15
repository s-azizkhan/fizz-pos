"use client";

import { useActionState, useState } from "react";
import { deleteExpense, type ExpenseState } from "@/app/actions/expenses";
import { formatMoney } from "@/lib/store/format";
import { Chip, ChipBar } from "@/components/fizz/ui/controls";
import { useActionToast } from "@/lib/hooks/useActionToast";
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
  const [state, action, pending] = useActionState(deleteExpense, initial);
  useActionToast(state, { success: "Expense deleted" });
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
  const [cat, setCat] = useState<string>("all");

  if (rows.length === 0) {
    return (
      <div className="rounded-fizz border border-ink-line bg-ink-soft p-10 text-center text-steam">
        No expenses recorded yet. Add the first one above.
      </div>
    );
  }

  const categories = Array.from(new Set(rows.map((r) => r.category)));
  const shown = cat === "all" ? rows : rows.filter((r) => r.category === cat);
  const total = shown.reduce((s, r) => s + Number(r.amount), 0);

  const cls = "px-4 py-3 text-left";

  return (
    <>
      {/* Category filter */}
      <ChipBar label="Category" className="mb-4">
        <Chip active={cat === "all"} onClick={() => setCat("all")}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
        <span className="ml-auto text-sm text-steam">
          {shown.length} · {" "}
          <span className="font-display font-semibold text-fizz">
            {formatMoney(total.toFixed(2), currency)}
          </span>
        </span>
      </ChipBar>

      {/* Mobile: stacked cards */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {shown.map((r) => (
          <li
            key={r.id}
            className="rounded-fizz border border-ink-line bg-ink-soft p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-cream">{fmtDate(r.expenseDate)}</span>
                <span className="w-fit rounded-full border border-ink-line px-2.5 py-0.5 text-xs text-cream">
                  {r.category}
                </span>
              </div>
              <span className="font-display text-lg font-semibold text-fizz">
                {formatMoney(r.amount, currency)}
              </span>
            </div>

            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-steam">Description</dt>
                <dd className="text-right text-cream">{r.description ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-steam">Vendor</dt>
                <dd className="text-right text-cream">{r.vendor ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-steam">Method</dt>
                <dd className="text-right text-cream">{METHOD_LABELS[r.paymentMethod]}</dd>
              </div>
            </dl>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink-line/60 pt-3 text-xs text-steam">
              <span>
                by {r.enteredByName ?? "—"} · {fmtDateTime(r.createdAt)}
              </span>
              {canDelete && <DeleteButton id={r.id} />}
            </div>
          </li>
        ))}
      </ul>

      {/* sm and up: table */}
      <div className="hidden overflow-x-auto rounded-fizz border border-ink-line bg-ink-soft sm:block">
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
            {shown.map((r) => (
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
    </>
  );
}
