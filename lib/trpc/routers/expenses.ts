import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, expenseForm } from "@/lib/db/schema";
import { STORE_ID } from "@/lib/store/constants";
import { listExpenses, getExpense } from "@/lib/store/expenses";
import { router, protectedProcedure } from "@/lib/trpc/init";

export const expensesRouter = router({
  list: protectedProcedure.query(() => listExpenses()),

  byId: protectedProcedure.input(z.uuid()).query(({ input }) => getExpense(input)),

  // Any signed-in user may record; we stamp who keyed it.
  create: protectedProcedure
    .input(expenseForm)
    .mutation(async ({ ctx, input }) => {
      try {
        await db
          .insert(expenses)
          .values({ ...input, storeId: STORE_ID, enteredBy: ctx.user.id });
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
              eq(expenses.storeId, STORE_ID),
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
