import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/dal";

// cookies() reads the ambient request store, which fetchRequestHandler runs
// inside — so no req/headers need threading through here.
export async function createContext() {
  return { user: await getSessionUser() };
}

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  // Reads carry Drizzle `timestamp` -> Date across the wire (stock movements).
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Every component renders exactly one error string. tRPC's default message
    // for an input failure is the JSON-stringified issue array, which would
    // land raw in the UI — collapse it to the first issue's message, matching
    // what the Server Actions used to return.
    const zodError = error.cause instanceof z.ZodError ? error.cause : null;
    return {
      ...shape,
      message: zodError
        ? zodError.issues[0]?.message ?? "Invalid input"
        : shape.message,
      data: {
        ...shape.data,
        // zod 4: top-level flattenError, not the removed err.flatten() method.
        zod: zodError ? z.flattenError(zodError) : null,
      },
    };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { user: ctx.user } }); // narrows to non-null downstream
});

// One definition of the editor gate. This replaces the requireEditor()
// helper that used to be copy-pasted into the inventory and menu actions.
export const editorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins and managers can do that.",
    });
  }
  return next();
});

