import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { store, storeSettingsForm, ticketLayoutInput } from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import { getStore } from "@/lib/store/data";
import { router, protectedProcedure, editorProcedure } from "@/lib/trpc/init";

export const storeRouter = router({
  get: protectedProcedure.query(() => getStore()),

  // Every POS refetches this on focus so a design change lands without a reload.
  ticketLayouts: protectedProcedure.query(async () => (await getStore()).ticketLayouts ?? {}),

  setTicketLayout: editorProcedure
    .input(ticketLayoutInput)
    .mutation(async ({ input }) => {
      // Merge one kind in SQL so saving the KOT never clobbers the receipt.
      await db
        .update(store)
        .set({
          ticketLayouts: sql`coalesce(${store.ticketLayouts}, '{}'::jsonb) || jsonb_build_object(${input.kind}::text, ${JSON.stringify(input.blocks)}::jsonb)`,
          updatedAt: new Date(),
        })
        .where(eq(store.id, STORE_ID));
      return { ok: true as const };
    }),

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
