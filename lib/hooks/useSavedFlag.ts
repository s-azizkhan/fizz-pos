"use client";

import { useEffect, useState } from "react";

// Shows a transient "saved" confirmation for `ms` after a server action
// reports success. Centralises the after-success side-effect so each form
// doesn't repeat (and mis-lint) the same setState-in-effect pattern.
export function useSavedFlag(ok: boolean | undefined, ms = 3000): boolean {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!ok) return;
    // Reacting to an external action result is a valid effect side-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(true);
    const t = setTimeout(() => setSaved(false), ms);
    return () => clearTimeout(t);
  }, [ok, ms]);
  return saved;
}
