"use client";

import { useState } from "react";
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
          mutations: { retry: 0 },
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

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
