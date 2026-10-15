import { TRPCError } from "@trpc/server";
import { count, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { store, users, loginForm, signupForm } from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import { loadStore } from "@/lib/store/data";
import { bust } from "@/lib/store/cache";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
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

  // Owner signup is open only while the counter has no users — single-store
  // app, so the first account owns it and everyone else joins by invite.
  canSignup: publicProcedure.query(async () => {
    const [{ n }] = await db.select({ n: count() }).from(users);
    return n === 0;
  }),

  signup: publicProcedure.input(signupForm).mutation(async ({ input }) => {
    await loadStore(); // ensure the singleton row exists before naming it
    const passwordHash = await hashPassword(input.password);
    const user = await db.transaction(async (tx) => {
      // Serialise concurrent signups so two first owners can't both win.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('fizz.signup'))`);
      const [{ n }] = await tx.select({ n: count() }).from(users);
      if (n > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This counter already has an owner. Sign in or ask for an invite.",
        });
      }
      const [created] = await tx
        .insert(users)
        .values({ email: input.email, name: input.name, passwordHash, role: "admin" })
        .returning({ id: users.id, role: users.role });
      await tx
        .update(store)
        .set({ name: input.storeName, updatedAt: new Date() })
        .where(eq(store.id, STORE_ID));
      return created;
    });
    bust("store");
    await createSession({ userId: user.id, role: user.role });
    return { ok: true as const, redirectTo: "/onboarding" };
  }),

  logout: publicProcedure.mutation(async () => {
    await deleteSession();
    return { ok: true as const, redirectTo: "/login" };
  }),
});
