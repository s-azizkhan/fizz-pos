"use client";

import { useState, useTransition } from "react";
import { createCategory } from "@/app/actions/menu";
import { toast } from "@/lib/store/toast";
import IconPicker from "./IconPicker";

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";
const btnPrimary =
  "rounded-fizz bg-fizz px-5 py-2.5 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60";

function toFormData(obj: Record<string, string | number | boolean>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) fd.set(k, String(v));
  return fd;
}

export default function NewCategoryModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<string>("☕");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addCategory() {
    setError(null);
    startTransition(async () => {
      const res = await createCategory({ ok: false }, toFormData({ name: newName, icon: newIcon }));
      if (res.ok) {
        setNewName("");
        setNewIcon("☕");
        toast.success("Category added");
        onClose();
      } else {
        setError(res.error ?? "Failed");
        toast.error(res.error ?? "Couldn't add category");
      }
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-fizz bg-ink p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">New category</h2>
            <p className="mt-1 text-sm text-steam">
              Create a new category for your menu items.
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

        <div className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className={labelCls}>Category name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Hot Coffee"
              className={inputCls}
            />
          </label>

          <div>
            <IconPicker value={newIcon} onChange={setNewIcon} />
          </div>

          {error && <p className="text-sm text-[#E2655A]">{error}</p>}
        </div>

        <div className="mt-6 flex items-center justify-end gap-4 border-t border-ink-line pt-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={addCategory}
            disabled={pending || !newName.trim()}
            className={btnPrimary}
          >
            {pending ? "Adding…" : "Add category"}
          </button>
        </div>
      </div>
    </div>
  );
}
