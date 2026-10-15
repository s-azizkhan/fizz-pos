import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailySales, dailySaleForm, orders } from "@/lib/db/schema";
import { listDailySales, getDailySale } from "@/lib/store/daily-sales";
import { fromDateInput } from "@/lib/store/date-range";
import { router, featureGate, protectedProcedure } from "@/lib/trpc/init";

const fizzled = new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "Something fizzled. Try again.",
});

// Whole router belongs to one feature; switched off = every call refuses.
const gate = featureGate("dailySales");

export const dailySalesRouter = router({
  list: protectedProcedure
    .use(gate)
    .input(z.string().regex(/^\d{4}-\d{2}$/))
    .query(({ input }) => listDailySales(input)),

  byId: protectedProcedure.use(gate).input(z.uuid()).query(({ input }) => getDailySale(input)),

  // Paid POS orders for one day, split to match the form. Card counts as
  // credit — the order enum mirrors the daily-sales split (see order.ts).
  tillTotals: protectedProcedure
    .use(gate)
    .input(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .query(async ({ ctx, input }) => {
      const start = fromDateInput(input);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
      const rows = await db
        .select({
          method: orders.paymentMethod,
          total: sql<string>`coalesce(sum(${orders.total}), 0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.storeId, ctx.user.storeId),
            eq(orders.status, "paid"),
            gte(orders.paidAt, start),
            lt(orders.paidAt, end),
          ),
        )
        .groupBy(orders.paymentMethod);
      const by = (m: string) => Number(rows.find((r) => r.method === m)?.total ?? 0).toFixed(2);
      return { cashSale: by("cash"), onlineSale: by("online"), creditSale: by("card") };
    }),

  // Any signed-in user may record; we stamp who keyed it.
  create: protectedProcedure
    .use(gate)
    .input(dailySaleForm)
    .mutation(async ({ ctx, input }) => {
      try {
        await db
          .insert(dailySales)
          .values({ ...input, storeId: ctx.user.storeId, enteredBy: ctx.user.id });
      } catch {
        throw fizzled;
      }
      revalidatePath("/dashboard/sales");
      return { ok: true as const };
    }),

  // Soft-delete. Admins and managers only.
  delete: protectedProcedure
    .use(gate)
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
              eq(dailySales.storeId, ctx.user.storeId),
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
