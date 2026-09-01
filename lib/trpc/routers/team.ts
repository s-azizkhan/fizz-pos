import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  acceptInviteSchema,
  inviteSchema,
  invites,
  updateRoleSchema,
  users,
} from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { router, adminProcedure, publicProcedure } from "@/lib/trpc/init";

const INVITE_TTL_DAYS = 7;

function expiry(): Date {
  return new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);
}

// One definition of "still worth showing": unspent and unexpired. An expired
// invite is a dead link — it's hidden rather than listed, and re-inviting the
// same email clears the row anyway.
const live = () => and(isNull(invites.acceptedAt), gt(invites.expiresAt, new Date()));

export const teamRouter = router({
  list: adminProcedure.query(async () => {
    const [members, pending] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(asc(users.createdAt)),
      db
        .select({
          id: invites.id,
          email: invites.email,
          role: invites.role,
          token: invites.token,
          expiresAt: invites.expiresAt,
          createdAt: invites.createdAt,
        })
        .from(invites)
        .where(live())
        .orderBy(desc(invites.createdAt)),
    ]);
    return { members, pending };
  }),

  // No mail transport — the procedure mints the token and the admin copies the
  // link by hand. Re-inviting the same email replaces the outstanding invite so
  // an old link can't linger alongside a new one.
  invite: adminProcedure
    .input(inviteSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (existing[0]) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That email is already on the team.",
        });
      }

      const token = randomBytes(32).toString("base64url");
      const row = await db.transaction(async (tx) => {
        await tx
          .delete(invites)
          .where(and(eq(invites.email, input.email), isNull(invites.acceptedAt)));
        const [created] = await tx
          .insert(invites)
          .values({
            email: input.email,
            role: input.role,
            token,
            invitedBy: ctx.user.id,
            expiresAt: expiry(),
          })
          .returning();
        return created;
      });
      return row;
    }),

  revoke: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      await db
        .delete(invites)
        .where(and(eq(invites.id, input.id), isNull(invites.acceptedAt)));
      return { ok: true as const };
    }),

  updateRole: adminProcedure
    .input(updateRoleSchema)
    .mutation(async ({ ctx, input }) => {
      // Blocks the only lockout path: an admin can demote peers but never
      // themselves, so the last admin always keeps the keys.
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't change your own role.",
        });
      }
      await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));
      return { ok: true as const };
    }),

  remove: adminProcedure
    .input(z.object({ userId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't remove yourself.",
        });
      }
      await db.delete(users).where(eq(users.id, input.userId));
      return { ok: true as const };
    }),

  // --- Public: the invite link ---------------------------------------------
  // Shows the invitee what they're accepting. Returns email + role only —
  // never the token or who invited them.
  peek: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const invite = await findLiveInvite(input.token);
      return { email: invite.email, role: invite.role };
    }),

  accept: publicProcedure
    .input(acceptInviteSchema)
    .mutation(async ({ input }) => {
      const invite = await findLiveInvite(input.token);
      const passwordHash = await hashPassword(input.password);

      const user = await db.transaction(async (tx) => {
        const taken = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, invite.email))
          .limit(1);
        if (taken[0]) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That email already has an account. Sign in instead.",
          });
        }
        const [created] = await tx
          .insert(users)
          .values({
            email: invite.email,
            name: input.name,
            passwordHash,
            // Role comes from the invite, never from the invitee's form.
            role: invite.role,
          })
          .returning({ id: users.id, role: users.role });
        await tx
          .update(invites)
          .set({ acceptedAt: new Date() })
          .where(eq(invites.id, invite.id));
        return created;
      });

      await createSession({ userId: user.id, role: user.role });
      return { ok: true as const, redirectTo: "/dashboard" };
    }),
});

async function findLiveInvite(token: string) {
  const [invite] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.token, token), live()))
    .limit(1);
  if (!invite) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This invite link is expired or already used.",
    });
  }
  return invite;
}
