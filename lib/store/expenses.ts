import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, users, type Expense } from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";

export type ExpenseRow = Expense & {
  enteredByName: string | null;
};

// List active (not soft-deleted) expenses, newest date first, with the name of
// whoever keyed each one.
export async function listExpenses(): Promise<ExpenseRow[]> {
  const rows = await db
    .select({
      expense: expenses,
      enteredByName: users.name,
    })
    .from(expenses)
    .leftJoin(users, eq(expenses.enteredBy, users.id))
    .where(and(eq(expenses.storeId, STORE_ID), isNull(expenses.deletedAt)))
    .orderBy(desc(expenses.expenseDate), desc(expenses.id));

  return rows.map(({ expense, enteredByName }) => ({ ...expense, enteredByName }));
}

export async function getExpense(id: number): Promise<Expense | undefined> {
  const [row] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.storeId, STORE_ID), isNull(expenses.deletedAt)))
    .limit(1);
  return row;
}
