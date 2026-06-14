"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { store, storeSettingsForm } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { STORE_ID } from "@/lib/store/constants";

export type StoreState = { ok: boolean; error?: string };

export async function updateStore(
  _prev: StoreState,
  formData: FormData,
): Promise<StoreState> {
  // Authorization: admins only. Mutations re-check, never trust the UI.
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return { ok: false, error: "Only admins can edit store settings." };
  }

  const parsed = storeSettingsForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await db
      .update(store)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(store.id, STORE_ID));
    revalidatePath("/dashboard/store");
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}
