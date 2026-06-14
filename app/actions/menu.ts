"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, max, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categoryForm,
  itemForm,
  menuAppearanceForm,
  menuCategories,
  menuItems,
  menuItemVariants,
  store,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { STORE_ID } from "@/lib/store/constants";
import { parseId } from "@/lib/store/ids";

export type MenuState = { ok: boolean; error?: string };

// Only admins and managers shape the menu.
async function requireEditor(): Promise<{ id: string } | { error: string }> {
  const user = await getCurrentUser();
  if (user.role !== "admin" && user.role !== "manager") {
    return { error: "Only admins and managers can edit the menu." };
  }
  return { id: user.id };
}

function bump() {
  revalidatePath("/dashboard/menu");
}

// ---- Categories ---------------------------------------------------------

export async function createCategory(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const auth = await requireEditor();
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = categoryForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const [{ value: maxPos } = { value: null }] = await db
      .select({ value: max(menuCategories.position) })
      .from(menuCategories)
      .where(and(eq(menuCategories.storeId, STORE_ID), isNull(menuCategories.deletedAt)));
    await db
      .insert(menuCategories)
      .values({ ...parsed.data, storeId: STORE_ID, position: (maxPos ?? 0) + 1, enteredBy: auth.id });
    bump();
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}

export async function updateCategory(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const auth = await requireEditor();
  if ("error" in auth) return { ok: false, error: auth.error };

  const id = parseId(formData.get("id"));
  if (!id) return { ok: false, error: "Invalid category." };

  const parsed = categoryForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await db
      .update(menuCategories)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(menuCategories.id, id), eq(menuCategories.storeId, STORE_ID), isNull(menuCategories.deletedAt)));
    bump();
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}

export async function deleteCategory(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const auth = await requireEditor();
  if ("error" in auth) return { ok: false, error: auth.error };

  const id = parseId(formData.get("id"));
  if (!id) return { ok: false, error: "Invalid category." };

  try {
    await db
      .update(menuCategories)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(menuCategories.id, id), eq(menuCategories.storeId, STORE_ID)));
    bump();
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}

// Persist a new category order. Accepts an array of category ids in order.
export async function reorderCategories(ids: string[]): Promise<MenuState> {
  const auth = await requireEditor();
  if ("error" in auth) return { ok: false, error: auth.error };
  if (!Array.isArray(ids) || ids.some((n) => typeof n !== "string" || n.length === 0)) {
    return { ok: false, error: "Invalid order." };
  }

  try {
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(menuCategories)
          .set({ position: i + 1, updatedAt: new Date() })
          .where(and(eq(menuCategories.id, ids[i]), eq(menuCategories.storeId, STORE_ID)));
      }
    });
    bump();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save order." };
  }
}

// ---- Items + variants ---------------------------------------------------

export async function createItem(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const auth = await requireEditor();
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = itemForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { variants, ...item } = parsed.data;

  try {
    // Guard: the chosen category must belong to this store.
    const [owner] = await db
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .where(
        and(
          eq(menuCategories.id, item.categoryId),
          eq(menuCategories.storeId, STORE_ID),
          isNull(menuCategories.deletedAt),
        ),
      )
      .limit(1);
    if (!owner) return { ok: false, error: "Unknown category." };

    const [{ value: maxPos } = { value: null }] = await db
      .select({ value: max(menuItems.position) })
      .from(menuItems)
      .where(and(eq(menuItems.categoryId, item.categoryId), isNull(menuItems.deletedAt)));

    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(menuItems)
        .values({ ...item, position: (maxPos ?? 0) + 1 })
        .returning({ id: menuItems.id });
      if (variants.length) {
        await tx.insert(menuItemVariants).values(
          variants.map((v, i) => ({ ...v, itemId: created.id, position: i + 1 })),
        );
      }
    });
    bump();
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}

export async function updateItem(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const auth = await requireEditor();
  if ("error" in auth) return { ok: false, error: auth.error };

  const id = parseId(formData.get("id"));
  if (!id) return { ok: false, error: "Invalid item." };

  const parsed = itemForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { variants, ...item } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(menuItems)
        .set({ ...item, updatedAt: new Date() })
        .where(and(eq(menuItems.id, id), isNull(menuItems.deletedAt)));
      // Replace variants wholesale — simplest correct sync for a small list.
      await tx.delete(menuItemVariants).where(eq(menuItemVariants.itemId, id));
      if (variants.length) {
        await tx.insert(menuItemVariants).values(
          variants.map((v, i) => ({ ...v, itemId: id, position: i + 1 })),
        );
      }
    });
    bump();
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}

export async function deleteItem(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const auth = await requireEditor();
  if ("error" in auth) return { ok: false, error: auth.error };

  const id = parseId(formData.get("id"));
  if (!id) return { ok: false, error: "Invalid item." };

  try {
    await db
      .update(menuItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(menuItems.id, id));
    bump();
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}

// Toggle item availability without opening the full editor.
export async function toggleItemAvailable(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const auth = await requireEditor();
  if ("error" in auth) return { ok: false, error: auth.error };

  const id = parseId(formData.get("id"));
  if (!id) return { ok: false, error: "Invalid item." };

  try {
    await db
      .update(menuItems)
      .set({ available: sql`NOT ${menuItems.available}`, updatedAt: new Date() })
      .where(and(eq(menuItems.id, id), isNull(menuItems.deletedAt)));
    bump();
    return { ok: true };
  } catch {
    return { ok: false, error: "Something fizzled. Try again." };
  }
}

// ---- Public menu appearance --------------------------------------------

export async function updateMenuAppearance(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    return { ok: false, error: "Only admins can edit menu settings." };
  }

  const parsed = menuAppearanceForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await db
      .update(store)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(store.id, STORE_ID));
    revalidatePath("/dashboard/menu");
    if (parsed.data.menuSlug) revalidatePath(`/m/${parsed.data.menuSlug}`);
    return { ok: true };
  } catch (e) {
    // Unique violation on slug is the common case.
    const msg = String(e);
    if (msg.includes("menu_slug") || msg.includes("unique")) {
      return { ok: false, error: "That menu link is taken. Try another." };
    }
    return { ok: false, error: "Something fizzled. Try again." };
  }
}
