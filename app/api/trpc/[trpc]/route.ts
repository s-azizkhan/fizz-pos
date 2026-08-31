import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/lib/trpc/root";
import { createContext } from "@/lib/trpc/init";

// No `export const runtime = "edge"` — postgres.js needs Node, which is the
// default. proxy.ts's matcher excludes /api, so procedure middleware is the
// only auth gate here; that's deliberate (a fetch() wants 401 JSON, not a 307
// to an HTML login page).
function handler(req: Request) {
  // Server Actions get Origin/Host validation from the framework. Route
  // Handlers do not, and this is a cookie-authed POST endpoint for a till.
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (!origin || new URL(origin).host !== host) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV !== "production"
        ? ({ path, error }) => console.error(`[trpc] ${path}:`, error.message)
        : undefined,
  });
}

export { handler as GET, handler as POST };
