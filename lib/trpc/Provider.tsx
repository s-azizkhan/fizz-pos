"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { TRPCProvider } from "@/lib/trpc/client";
import { toast } from "@/lib/store/toast";
import { isNetworkError, outbox } from "@/lib/store/outbox";
import type { AppRouter } from "@/lib/trpc/root";

function codeOf(error: unknown) {
  return (error as { data?: { code?: string } })?.data?.code;
}

// A session that expired mid-use should bounce to /login. A failed login is
// also 401, but bouncing there would reload the page and wipe the inline
// "Wrong email or password." — so never redirect when we are already on it.
function isExpiredSession(error: unknown) {
  return codeOf(error) === "UNAUTHORIZED" && window.location.pathname !== "/login";
}

// Abort a request that hangs — lie-fi: wifi says connected, nothing moves.
// Without this a stalled checkout spins on "Ringing…" for minutes and never
// reaches the offline queue. The abort surfaces as a TRPCClientError with no
// `data`, i.e. isNetworkError, so the sale queues; clientId makes the replay
// safe even if the slow original did land. 12s is well past a slow-3G sale.
const TIMEOUT_MS = 12_000;
function fetchWithTimeout(url: RequestInfo | URL, init?: RequestInit) {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  // Queries carry react-query's own signal; keep it. ponytail: browsers without
  // AbortSignal.any (Safari < 17.4) keep the caller's signal and get no timeout.
  const signal = !init?.signal
    ? timeout
    : "any" in AbortSignal
      ? AbortSignal.any([init.signal, timeout])
      : init.signal;
  return fetch(url, { ...init, signal });
}

export default function Provider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // NON-NEGOTIABLE. nextOrderNumber() increments the store row outside
          // the transaction, so every checkout call burns an order number — a
          // retry on a timeout where the write landed would create a second
          // order and deduct stock twice. Never override this per-mutation.
          // networkMode "always": the default ("online") PAUSES mutations while
          // the browser is offline — mutateAsync never settles and the button
          // spins forever. Offline must fail fast so the POS can queue the sale.
          mutations: { retry: 0, networkMode: "always" },
          queries: { retry: false },
        },
        // Configured once here instead of in all ~21 call sites.
        mutationCache: new MutationCache({
          // revalidatePath() in a Route Handler only marks a path for later; it
          // no longer pushes a fresh RSC payload the way a Server Action did.
          // Screens that already hold the new state (POS, KOT) opt out with
          // meta: { noRefresh: true } — a refresh there re-downloads the whole
          // page for nothing, which is seconds on a weak link.
          onSuccess: (_data, _vars, _ctx, mutation) => {
            if (!mutation.meta?.noRefresh) router.refresh();
          },
          onError: (error, _vars, _ctx, mutation) => {
            if (isExpiredSession(error)) {
              // Full navigation, not router.push: re-runs proxy.ts and drops
              // the client cache. /logout, not /login — the cookie may still
              // verify (deleted user), which /login would bounce back.
              window.location.href = "/logout";
              return;
            }
            // Sites that render the error inline opt out with
            // meta: { silentError: true } so a toast and a red line don't
            // both fire mid-rush.
            if (!mutation.meta?.silentError) toast.error(error.message);
          },
        }),
        queryCache: new QueryCache({
          onError: (error) => {
            if (isExpiredSession(error)) window.location.href = "/logout";
          },
        }),
      }),
  );

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        // httpBatchLink, never httpBatchStreamLink: Set-Cookie cannot be sent
        // once the response streams, which would make login silently issue no
        // session.
        httpBatchLink({ url: "/api/trpc", transformer: superjson, fetch: fetchWithTimeout }),
      ],
    }),
  );

  // Replay sales rung offline, oldest first, one at a time. Runs on load, on
  // the online edge, and on a timer — navigator.onLine can say "online" on a
  // captive wifi that goes nowhere, so the edge alone isn't enough.
  useEffect(() => {
    let busy = false;
    async function flush() {
      if (busy || !navigator.onLine) return;
      busy = true;
      let synced = 0;
      let bumps = 0;
      try {
        for (const sale of outbox.all()) {
          if (sale.failed) continue;
          try {
            if (sale.kind === "save") await trpcClient.orders.save.mutate(sale.input);
            else if (sale.kind === "kot") await replayKot(sale.input);
            else await trpcClient.orders.checkout.mutate(sale.input);
            outbox.remove(sale.input.clientId);
            if (sale.kind === "kot") bumps++;
            else synced++;
          } catch (e) {
            // Still offline, or signed out: stop and retry later, keep order.
            if (isNetworkError(e) || codeOf(e) === "UNAUTHORIZED") break;
            const msg = e instanceof Error ? e.message : "Rejected";
            // A refused bump isn't money — drop it; the board shows the truth.
            if (sale.kind === "kot") {
              outbox.remove(sale.input.clientId);
              toast.error(`A kitchen bump couldn't sync: ${msg}`);
              continue;
            }
            outbox.fail(sale.input.clientId, msg);
            toast.error(`An offline order couldn't sync: ${msg}`);
          }
        }
      } finally {
        busy = false;
      }
      // Replayed bumps: let the KOT board re-read the lanes.
      if (bumps) void queryClient.invalidateQueries();
      if (synced) {
        toast.success(`Synced ${synced} offline order${synced > 1 ? "s" : ""}`);
        router.refresh();
      }
    }
    // Bumps only move forward, so "already there" means another screen (or an
    // earlier delivery of this replay) beat us to it — that's done, not failed.
    async function replayKot({ orderId, to }: { orderId: string; to: "accepted" | "ready" }) {
      try {
        await trpcClient.orders.kotMove.mutate({ orderId, to });
      } catch (e) {
        if (codeOf(e) !== "CONFLICT" || !(e instanceof Error) || !e.message.startsWith("Already")) throw e;
      }
    }
    void flush();
    window.addEventListener("online", flush);
    const t = setInterval(flush, 30_000);
    return () => {
      window.removeEventListener("online", flush);
      clearInterval(t);
    };
  }, [trpcClient, router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
