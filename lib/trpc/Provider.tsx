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
          onSuccess: () => router.refresh(),
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
        httpBatchLink({ url: "/api/trpc", transformer: superjson }),
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
      try {
        for (const sale of outbox.all()) {
          if (sale.failed) continue;
          try {
            if (sale.kind === "save") await trpcClient.orders.save.mutate(sale.input);
            else await trpcClient.orders.checkout.mutate(sale.input);
            outbox.remove(sale.input.clientId);
            synced++;
          } catch (e) {
            // Still offline, or signed out: stop and retry later, keep order.
            if (isNetworkError(e) || codeOf(e) === "UNAUTHORIZED") break;
            const msg = e instanceof Error ? e.message : "Rejected";
            outbox.fail(sale.input.clientId, msg);
            toast.error(`An offline order couldn't sync: ${msg}`);
          }
        }
      } finally {
        busy = false;
      }
      if (synced) {
        toast.success(`Synced ${synced} offline order${synced > 1 ? "s" : ""}`);
        router.refresh();
      }
    }
    void flush();
    window.addEventListener("online", flush);
    const t = setInterval(flush, 30_000);
    return () => {
      window.removeEventListener("online", flush);
      clearInterval(t);
    };
  }, [trpcClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
