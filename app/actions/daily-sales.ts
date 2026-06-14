"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailySales, dailySaleForm } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { STORE_ID } from "@/lib/store/constants";

export type DailySaleState = { ok: boolean; error?: string };

// Record a day's takings. Any signed-in user may record; we stamp who keyed it.
export async function createDailySale(
  _prev: DailySaleState,
  formData: FormData,
): Promise<DailySaleState> {
  const user = await getCurrentUser();

  const parsed = dailySaleForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await db.insert(dailySales).values({ ...parsed.data, storeId: STORE_ID, enteredBy: user.id });
    revalidatePath("/dashboard/sales");
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}

// Soft-delete an entry. Admins and managers only.
export async function deleteDailySale(
  _prev: DailySaleState,
  formData: FormData,
): Promise<DailySaleState> {
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
      .update(dailySales)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(dailySales.id, id), eq(dailySales.storeId, STORE_ID), isNull(dailySales.deletedAt)));
    revalidatePath("/dashboard/sales");
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}
