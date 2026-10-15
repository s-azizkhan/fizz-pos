import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { onboardingForm, store, storeSettingsForm, ticketLayoutInput } from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import { getStore } from "@/lib/store/data";
import { bust } from "@/lib/store/cache";
import { router, adminProcedure, featureGate, protectedProcedure, editorProcedure } from "@/lib/trpc/init";

export const storeRouter = router({
  get: protectedProcedure.query(() => getStore()),

  // Every POS refetches this on focus so a design change lands without a reload.
  ticketLayouts: protectedProcedure.query(async () => (await getStore()).ticketLayouts ?? {}),

  setTicketLayout: editorProcedure
    .use(featureGate("printers"))
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
      bust("store");
      return { ok: true as const };
    }),

  // First-run wizard. Stamps onboardedAt so the dashboard stops redirecting;
  // "skip" is the same call with the form's defaults.
  onboard: adminProcedure.input(onboardingForm).mutation(async ({ input }) => {
    await db
      .update(store)
      .set({ ...input, onboardedAt: new Date(), updatedAt: new Date() })
      .where(eq(store.id, STORE_ID));
    bust("store");
    revalidatePath("/", "layout");
    return { ok: true as const, redirectTo: "/dashboard" };
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
      bust("store");
      revalidatePath("/dashboard/store");
      // Feature switches reshape the nav and the public menu.
      revalidatePath("/", "layout");
      return { ok: true as const };
    }),
});
