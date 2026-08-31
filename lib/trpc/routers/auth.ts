import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, loginForm } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { router, publicProcedure, protectedProcedure } from "@/lib/trpc/init";

export const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => ctx.user),

  // cookies().set()/.delete() are supported in a Route Handler, so the session
  // is issued here exactly as the Server Action did. redirect() is NOT usable
  // in a procedure (tRPC swallows the NEXT_REDIRECT digest into a 500, and
  // fetch would transparently follow a 307), so the caller navigates instead.
  // NOTE: this requires httpBatchLink — Set-Cookie cannot be sent once a
  // response starts streaming. See lib/trpc/Provider.tsx.
  login: publicProcedure.input(loginForm).mutation(async ({ input }) => {
    const { email, password } = input;
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];

    // Same generic message + always run a hash compare so timing doesn't leak
    // whether the email exists.
    const fallbackHash =
      "0000000000000000000000000000000000000000000000000000000000000000.0000000000000000000000000000000000000000000000000000000000000000";
    const ok = await verifyPassword(password, user?.passwordHash ?? fallbackHash);

    if (!user || !ok) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Wrong email or password." });
    }

    await createSession({ userId: user.id, role: user.role });
    return { ok: true as const, redirectTo: "/dashboard" };
  }),

  logout: publicProcedure.mutation(async () => {
    await deleteSession();
    return { ok: true as const, redirectTo: "/login" };
  }),
});
