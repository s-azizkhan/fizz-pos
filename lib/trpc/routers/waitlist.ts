import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { waitlist, waitlistForm } from "@/lib/db/schema";
import { router, publicProcedure } from "@/lib/trpc/init";

export const waitlistRouter = router({
  // Public by design — the marketing page's conversion form.
  // `|| null`, not `??`: over JSON an untouched input arrives as "", where
  // FormData.get() used to yield null.
  join: publicProcedure.input(waitlistForm).mutation(async ({ input }) => {
    try {
      await db
        .insert(waitlist)
        .values({
          phone: input.phone,
          email: input.email || null,
          cafeName: input.cafeName || null,
        })
        .onConflictDoNothing();
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Something fizzled. Try again.",
      });
    }
    return { ok: true as const };
  }),
});
