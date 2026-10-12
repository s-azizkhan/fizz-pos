"use client";

import { create } from "zustand";
import Modal from "@/components/fizz/Modal";
import { AlertIcon, CheckIcon, HelpIcon, TrashIcon } from "@/components/fizz/dashboard/icons";

type Ask = {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
};

type ConfirmState = {
  ask: Ask | null;
  resolve: ((ok: boolean) => void) | null;
};

const useConfirmStore = create<ConfirmState>(() => ({ ask: null, resolve: null }));

// Brand replacement for window.confirm: `if (!(await confirmDialog({...}))) return;`
// Resolves false on cancel, Escape, or backdrop click.
export function confirmDialog(ask: Ask) {
  return new Promise<boolean>((resolve) => {
    useConfirmStore.getState().resolve?.(false); // one dialog at a time
    useConfirmStore.setState({ ask, resolve });
  });
}

function settle(ok: boolean) {
  useConfirmStore.getState().resolve?.(ok);
  useConfirmStore.setState({ ask: null, resolve: null });
}

const cancel = () => settle(false);

// Mounted once in the root layout, next to <Toaster />.
export default function ConfirmHost() {
  const ask = useConfirmStore((s) => s.ask);

  return (
    <Modal open={!!ask} onClose={cancel} maxWidth="max-w-md">
      {ask && (
        <div className="rounded-fizz border border-ink-line bg-ink-soft p-6">
          <span
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border ${
              ask.danger ? "border-[#E2655A]/40 text-[#E2655A]" : "border-fizz/40 text-fizz"
            }`}
          >
            {ask.danger ? <AlertIcon className="h-5 w-5" /> : <HelpIcon className="h-5 w-5" />}
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-fizz">
            Confirm
          </p>
          <h2 className="mt-2 max-w-[20ch] font-display text-2xl font-bold tracking-tight text-cream">
            {ask.title}
          </h2>
          {ask.body && <p className="mt-2 max-w-[60ch] text-steam">{ask.body}</p>}
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={cancel}
              className="flex-1 rounded-fizz border border-ink-line px-4 py-3 font-semibold text-steam transition-colors hover:border-fizz hover:text-fizz"
            >
              Cancel
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => settle(true)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-fizz px-4 py-3 font-semibold transition-transform hover:scale-105 ${
                ask.danger
                  ? "border border-[#E2655A] text-[#E2655A]"
                  : "bg-fizz text-ink"
              }`}
            >
              {ask.danger ? <TrashIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
              {ask.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
