import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { getStore } from "@/lib/store/data";
import { listExpenses } from "@/lib/store/expenses";
import { formatMoney } from "@/lib/store/format";
import ExpensesTable from "@/components/fizz/ExpensesTable";
import RecordExpenseModal from "@/components/fizz/RecordExpenseModal";

export const metadata: Metadata = {
  title: "Expenses — Fizz",
};

export default async function ExpensesPage() {
  const user = await getCurrentUser();
  const [store, rows] = await Promise.all([getStore(), listExpenses()]);
  const canDelete = user.role === "admin" || user.role === "manager";

  const grandTotal = rows.reduce((sum, r) => sum + Number(r.amount), 0).toFixed(2);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
        Floor
      </p>
      <h1 className="mt-3 font-display text-[clamp(28px,5vw,44px)] font-bold tracking-tight">
        Expenses
      </h1>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-[60ch] text-lg text-steam">
          Track every cost — inventory, rent, payroll, and more — so you always
          know where the money went.
        </p>
        <RecordExpenseModal currency={store.currency} />
      </div>

      <div className="mt-12 flex items-end justify-between gap-4">
        <h2 className="font-display text-xl font-bold tracking-tight">History</h2>
        {rows.length > 0 && (
          <p className="text-sm text-steam">
            {rows.length} {rows.length === 1 ? "entry" : "entries"} ·{" "}
            <span className="font-semibold text-fizz">
              {formatMoney(grandTotal, store.currency)}
            </span>{" "}
            spent
          </p>
        )}
      </div>

      <div className="mt-5">
        <ExpensesTable rows={rows} currency={store.currency} canDelete={canDelete} />
      </div>
    </div>
  );
}
