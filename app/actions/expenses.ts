"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, expenseForm } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";

export type ExpenseState = { ok: boolean; error?: string };

// Record an expense. Any signed-in user may record; we stamp who keyed it.
export async function createExpense(
  _prev: ExpenseState,
  formData: FormData,
): Promise<ExpenseState> {
  const user = await getCurrentUser();

  const parsed = expenseForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await db.insert(expenses).values({ ...parsed.data, enteredBy: user.id });
    revalidatePath("/dashboard/expenses");
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}

// Soft-delete an expense. Admins and managers only.
export async function deleteExpense(
  _prev: ExpenseState,
  formData: FormData,
): Promise<ExpenseState> {
  const user = await getCurrentUser();
  if (user.role !== "admin" && user.role !== "manager") {
    return { ok: false, error: "Not allowed to delete entries." };
  }

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: "Invalid entry." };
  }

  try {
    await db
      .update(expenses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(expenses.id, id), isNull(expenses.deletedAt)));
    revalidatePath("/dashboard/expenses");
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}
