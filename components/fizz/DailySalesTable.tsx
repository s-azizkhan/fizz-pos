"use client";

import { useActionState } from "react";
import { deleteDailySale, type DailySaleState } from "@/app/actions/daily-sales";
import { formatMoney } from "@/lib/store/format";
import { useActionToast } from "@/lib/hooks/useActionToast";
import type { DailySaleRow } from "@/lib/store/daily-sales";

const initial: DailySaleState = { ok: false };

function fmtDate(d: string): string {
  // saleDate is a YYYY-MM-DD string from the date column.
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
  const [state, action, pending] = useActionState(deleteDailySale, initial);
  useActionToast(state, { success: "Sale deleted" });
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

export default function DailySalesTable({
  rows,
  currency,
  canDelete,
}: {
  rows: DailySaleRow[];
  currency: string;
  canDelete: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-fizz border border-ink-line bg-ink-soft p-10 text-center text-steam">
        No sales recorded yet. Pour the first one above.
      </div>
    );
  }

  const cls = "px-4 py-3 text-left";

  return (
    <>
      {/* Mobile: stacked cards */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-fizz border border-ink-line bg-ink-soft p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium text-cream">{fmtDate(r.saleDate)}</span>
              <span className="font-display text-lg font-semibold text-fizz">
                {formatMoney(r.total, currency)}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-steam">Cash</dt>
                <dd className="text-cream">{formatMoney(r.cashSale, currency)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-steam">Online</dt>
                <dd className="text-cream">{formatMoney(r.onlineSale, currency)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-steam">Credit</dt>
                <dd className="text-cream">{formatMoney(r.creditSale, currency)}</dd>
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
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-line text-xs uppercase tracking-[0.14em] text-steam">
              <th className={cls}>Sale date</th>
              <th className={`${cls} text-right`}>Cash</th>
              <th className={`${cls} text-right`}>Online</th>
              <th className={`${cls} text-right`}>Credit</th>
              <th className={`${cls} text-right`}>Total</th>
              <th className={cls}>Entered by</th>
              <th className={cls}>Created</th>
              {canDelete && <th className={`${cls} text-right`}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-ink-line/60 last:border-0">
                <td className={`${cls} font-medium text-cream`}>{fmtDate(r.saleDate)}</td>
                <td className={`${cls} text-right text-cream`}>{formatMoney(r.cashSale, currency)}</td>
                <td className={`${cls} text-right text-cream`}>{formatMoney(r.onlineSale, currency)}</td>
                <td className={`${cls} text-right text-cream`}>{formatMoney(r.creditSale, currency)}</td>
                <td className={`${cls} text-right font-display font-semibold text-fizz`}>
                  {formatMoney(r.total, currency)}
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
