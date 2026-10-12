"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/store/toast";
import { useTRPC } from "@/lib/trpc/client";
import IconPicker from "./IconPicker";
import { CloseIcon, PlusIcon } from "@/components/fizz/dashboard/icons";

const inputCls =
  "w-full rounded-fizz border border-ink-line bg-ink-soft px-4 py-3 text-cream outline-none placeholder:text-steam focus:border-fizz focus:ring-2 focus:ring-fizz/40";
const labelCls = "text-xs font-semibold uppercase tracking-[0.18em] text-fizz";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-fizz bg-fizz px-5 py-2.5 font-semibold text-ink transition-transform hover:scale-105 disabled:opacity-60";

export default function NewCategoryModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<string>("☕");
  const trpc = useTRPC();
  const create = useMutation(
    trpc.menu.createCategory.mutationOptions({
      onSuccess: () => {
        setNewName("");
        setNewIcon("☕");
        toast.success("Category added");
        onClose();
      },
    }),
  );
  const error = create.error?.message ?? null;

  function addCategory() {
    create.mutate({ name: newName, icon: newIcon });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 sm:p-4">
      <div className="h-dvh w-full max-w-2xl overflow-y-auto bg-ink p-5 sm:h-auto sm:max-h-[90vh] sm:rounded-fizz sm:p-8 sm:shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">New category</h2>
            <p className="mt-1 text-sm text-steam">
              Create a new category for your menu items.
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-steam hover:text-fizz"
            aria-label="Close modal"
          >
            <CloseIcon className="h-5 w-5" />
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

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-ink-line pt-5 sm:gap-4 sm:pt-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-fizz border border-ink-line px-6 py-3 font-semibold text-cream transition-colors hover:border-fizz hover:text-fizz"
          >
            <CloseIcon className="h-4 w-4 shrink-0" />
            Cancel
          </button>
          <button
            type="button"
            onClick={addCategory}
            disabled={create.isPending || !newName.trim()}
            className={btnPrimary}
          >
            <PlusIcon className="h-4 w-4 shrink-0" />
            {create.isPending ? "Adding…" : "Add category"}
          </button>
        </div>
      </div>
    </div>
  );
}
