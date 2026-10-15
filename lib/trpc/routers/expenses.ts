import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, expenseForm } from "@/lib/db/schema";
import { listExpenses, getExpense } from "@/lib/store/expenses";
import { router, featureGate, protectedProcedure } from "@/lib/trpc/init";

// Whole router belongs to one feature; switched off = every call refuses.
const gate = featureGate("expenses");

export const expensesRouter = router({
  list: protectedProcedure
    .use(gate)
    .input(z.string().regex(/^\d{4}-\d{2}$/))
    .query(({ input }) => listExpenses(input)),

  byId: protectedProcedure.use(gate).input(z.uuid()).query(({ input }) => getExpense(input)),

  // Any signed-in user may record; we stamp who keyed it.
  create: protectedProcedure
    .use(gate)
    .input(expenseForm)
    .mutation(async ({ ctx, input }) => {
      try {
        await db
          .insert(expenses)
          .values({ ...input, storeId: ctx.user.storeId, enteredBy: ctx.user.id });
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Something fizzled. Try again.",
        });
      }
      revalidatePath("/dashboard/expenses");
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
          .update(expenses)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(expenses.id, input.id),
              eq(expenses.storeId, ctx.user.storeId),
              isNull(expenses.deletedAt),
            ),
          );
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Something fizzled. Try again.",
        });
      }
      revalidatePath("/dashboard/expenses");
      return { ok: true as const };
    }),
});
