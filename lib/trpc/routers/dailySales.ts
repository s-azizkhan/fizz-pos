import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailySales, dailySaleForm } from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import { listDailySales, getDailySale } from "@/lib/store/daily-sales";
import { router, protectedProcedure } from "@/lib/trpc/init";

const fizzled = new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "Something fizzled. Try again.",
});

export const dailySalesRouter = router({
  list: protectedProcedure.query(() => listDailySales()),

  byId: protectedProcedure.input(z.uuid()).query(({ input }) => getDailySale(input)),

  // Any signed-in user may record; we stamp who keyed it.
  create: protectedProcedure
    .input(dailySaleForm)
    .mutation(async ({ ctx, input }) => {
      try {
        await db
          .insert(dailySales)
          .values({ ...input, storeId: STORE_ID, enteredBy: ctx.user.id });
      } catch {
        throw fizzled;
      }
      revalidatePath("/dashboard/sales");
      return { ok: true as const };
    }),

  // Soft-delete. Admins and managers only.
  delete: protectedProcedure
    .input(z.object({ id: z.uuid("Invalid entry.") }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not allowed to delete entries.",
        });
      }
      try {
        await db
          .update(dailySales)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(dailySales.id, input.id),
              eq(dailySales.storeId, STORE_ID),
              isNull(dailySales.deletedAt),
            ),
          );
      } catch {
        throw fizzled;
      }
      revalidatePath("/dashboard/sales");
      return { ok: true as const };
    }),
});
