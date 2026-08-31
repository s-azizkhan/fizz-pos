import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { store, storeSettingsForm } from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import { getStore } from "@/lib/store/data";
import { router, protectedProcedure } from "@/lib/trpc/init";

export const storeRouter = router({
  get: protectedProcedure.query(() => getStore()),

  update: protectedProcedure
    .input(storeSettingsForm)
    .mutation(async ({ ctx, input }) => {
      // Authorization: admins only. Mutations re-check, never trust the UI.
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can edit store settings.",
        });
      }
      try {
        await db
          .update(store)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(store.id, STORE_ID));
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Something fizzled. Try again.",
        });
      }
      // Still correct for the data cache; no longer reaches the calling client
      // (see router.refresh() in lib/trpc/Provider.tsx).
      revalidatePath("/dashboard/store");
      return { ok: true as const };
    }),
});
