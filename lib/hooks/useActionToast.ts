"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/lib/store/toast";

type ActionResult = { ok?: boolean; error?: string };

// Fires a toast when a useActionState result changes. Pass the action state and
// the message to show on success; the error message comes from `state.error`
// (override with `error`). Dedupes by object identity so it fires once per
// submit, not on every render.
export function useActionToast(
  state: ActionResult,
  opts: { success?: string; error?: string },
) {
  const last = useRef<ActionResult | null>(null);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (state.ok && opts.success) toast.success(opts.success);
    else if (state.error) toast.error(opts.error ?? state.error);
  }, [state, opts.success, opts.error]);
}
