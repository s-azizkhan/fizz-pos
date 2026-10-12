"use client";

import superjson from "superjson";
import { TRPCClientError } from "@trpc/client";
import type { inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "@/lib/trpc/root";

type Inputs = inferRouterInputs<AppRouter>["orders"];
// A paid sale, or an open tab saved for later. Entries queued before `kind`
// existed are checkouts.
export type QueuedSale = (
  | { kind?: "checkout"; input: Inputs["checkout"] & { clientId: string } }
  | { kind: "save"; input: Inputs["save"] & { clientId: string } }
) & {
  // Set when the server rejected the sale outright (not a network blip). Kept,
  // never dropped — it's money — and skipped by the flush until someone looks.
  failed?: string;
};

const KEY = "fizz-outbox";
const listeners = new Set<() => void>();

// ponytail: localStorage, not IndexedDB — payloads are a few hundred bytes and
// the sync API keeps read-modify-write atomic within a tab. Every op re-reads
// storage rather than holding a copy, so two open tabs can't clobber each
// other's queued sales. Move to IndexedDB if queues ever reach MBs.
function read(): QueuedSale[] {
  try {
    return superjson.parse<QueuedSale[]>(localStorage.getItem(KEY) ?? "") ?? [];
  } catch {
    return [];
  }
}

function write(list: QueuedSale[]) {
  if (list.length) localStorage.setItem(KEY, superjson.stringify(list));
  else localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

// Sales rung while the network was down, waiting to be replayed in order.
export const outbox = {
  all: read,
  add: (sale: QueuedSale) => write([...read(), sale]),
  remove: (clientId: string) =>
    write(read().filter((s) => s.input.clientId !== clientId)),
  fail: (clientId: string, message: string) =>
    write(
      read().map((s) =>
        s.input.clientId === clientId ? { ...s, failed: message } : s,
      ),
    ),
};

// For useSyncExternalStore: the raw string is a stable snapshot.
export function subscribeOutbox(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}
export const outboxSnapshot = () => localStorage.getItem(KEY);
export const outboxCounts = (raw: string | null) => {
  if (!raw) return { pending: 0, failed: 0 };
  const list = read();
  const failed = list.filter((s) => s.failed).length;
  return { pending: list.length - failed, failed };
};

// The request never got a tRPC answer: offline, DNS, dropped socket, a proxy's
// HTML 502. The sale may or may not have landed — clientId makes a replay safe
// either way. A real server error carries `data` and is not a network error.
export const isNetworkError = (e: unknown) =>
  !navigator.onLine || (e instanceof TRPCClientError && !e.data);
