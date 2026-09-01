import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { SESSION_COOKIE, decrypt } from "@/lib/auth/session";

// Secure check: read cookie, verify JWT, then confirm the user still exists in
// the DB. Memoized per render so repeated calls in one pass hit the DB once.
export const verifySession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  if (!session) redirect("/logout");
  return session;
});

// Nullable variant. tRPC procedures MUST use this one: redirect() throws a
// NEXT_REDIRECT digest that tRPC swallows into a generic 500, so a procedure
// has to decide for itself (UNAUTHORIZED) rather than redirect.
export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  if (!session) return null;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return rows[0] ?? null; // null also covers a session pointing at a deleted user
});

// Redirecting variant for RSC pages and Server Actions. Sends dead sessions to
// /logout, not /login: a cookie that still verifies but points at a deleted user
// would be bounced straight back here by proxy.ts, looping forever. /logout
// clears the cookie first, then lands on /login.
export const getCurrentUser = cache(
  async () => (await getSessionUser()) ?? redirect("/logout"),
);
