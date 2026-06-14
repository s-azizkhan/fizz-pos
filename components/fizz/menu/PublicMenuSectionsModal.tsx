"use client";

import { useState, useTransition } from "react";
import { updateCategory } from "@/app/actions/menu";
import { MenuCategoryIconGlyph } from "./category-icons";
import type { MenuCategoryWithItems } from "@/lib/store/menu";

function toFormData(obj: Record<string, string | number | boolean>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) fd.set(k, String(v));
  return fd;
}

export default function PublicMenuSectionsModal({
  categories,
  isOpen,
  onClose,
}: {
  categories: MenuCategoryWithItems[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>(
    categories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.available !== false }), {})
  );
  const [pending, startTransition] = useTransition();

  const handleToggle = (categoryId: string) => {
    const newVisible = !visibleCategories[categoryId];
    setVisibleCategories((prev) => ({ ...prev, [categoryId]: newVisible }));

    startTransition(async () => {
      const category = categories.find((c) => c.id === categoryId);
      if (category) {
        await updateCategory(
          { ok: false },
          toFormData({
            id: categoryId,
            name: category.name,
            icon: category.icon,
            available: newVisible,
          })
        );
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-fizz bg-ink p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Menu sections</h2>
            <p className="mt-1 text-sm text-steam">
              Toggle which sections appear on your public menu.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-steam hover:text-fizz"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {categories.length === 0 ? (
            <p className="text-center text-steam">No sections yet. Create one in the menu editor.</p>
          ) : (
            categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-4 rounded-fizz border border-ink-line bg-ink-soft p-4 transition-colors hover:bg-ink-soft/80"
              >
                <input
                  type="checkbox"
                  checked={visibleCategories[category.id] ?? true}
                  onChange={() => handleToggle(category.id)}
                  disabled={pending}
                  className="h-5 w-5 accent-[#C6F432]"
                />
                <span className="text-lg"><MenuCategoryIconGlyph name={category.icon} /></span>
                <div className="flex-1">
                  <div className="font-semibold text-cream">{category.name}</div>
                  <div className="text-xs text-steam">{category.items.length} item{category.items.length !== 1 ? "s" : ""}</div>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-4 border-t border-ink-line pt-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
