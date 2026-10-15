import "server-only";
import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, users, type Expense } from "@/lib/db/schema";
import { currentStoreId } from "@/lib/auth/dal";
import { monthBounds } from "@/lib/store/date-range";

export type ExpenseRow = Expense & {
  enteredByName: string | null;
};

// List active (not soft-deleted) expenses in a YYYY-MM month, newest date
// first, with the name of whoever keyed each one.
export async function listExpenses(month: string): Promise<ExpenseRow[]> {
  const sid = await currentStoreId();
  const [start, end] = monthBounds(month);
  const rows = await db
    .select({
      expense: expenses,
      enteredByName: users.name,
    })
    .from(expenses)
    .leftJoin(users, eq(expenses.enteredBy, users.id))
    .where(
      and(
        eq(expenses.storeId, sid),
        isNull(expenses.deletedAt),
        gte(expenses.expenseDate, start),
        lt(expenses.expenseDate, end),
      ),
    )
    .orderBy(desc(expenses.expenseDate), desc(expenses.id));

  return rows.map(({ expense, enteredByName }) => ({ ...expense, enteredByName }));
}

export async function getExpense(id: string): Promise<Expense | undefined> {
  const sid = await currentStoreId();
  const [row] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.storeId, sid), isNull(expenses.deletedAt)))
    .limit(1);
  return row;
}
