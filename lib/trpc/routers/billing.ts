import { randomInt } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { confirmPaymentInput, payments, planRequestInput, setPlanInput, store, type Payment } from "@/lib/db/schema";
import { getStore } from "@/lib/store/data";
import { bust, storeTag } from "@/lib/store/cache";
import { planByKey, planStatus } from "@/lib/store/plans";
import { router, adminProcedure, platformProcedure, protectedProcedure } from "@/lib/trpc/init";

// FZ- + 6 unambiguous chars: short enough to type into a UPI note.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const reference = () => "FZ-" + Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

const open = (storeId: string) => and(eq(payments.storeId, storeId), eq(payments.status, "requested"));

// Mark a request paid and extend the store's plan. Renewing the same plan
// stacks onto the current end date; a different plan starts from now (no
// proration — ponytail: add credit if a customer asks).
async function activate(id: string, confirmedBy: string, note: string | null): Promise<Payment> {
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(payments).where(eq(payments.id, id)).limit(1).for("update");
    if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown request." });
    if (p.status !== "requested") throw new TRPCError({ code: "CONFLICT", message: `Already ${p.status}.` });

    const [s] = await tx
      .select({ plan: store.plan, planExpiresAt: store.planExpiresAt })
      .from(store)
      .where(eq(store.id, p.storeId))
      .limit(1);
    const now = new Date();
    const from = s.plan === p.plan && s.planExpiresAt && s.planExpiresAt > now ? s.planExpiresAt : now;
    const until = new Date(from);
    if (p.period === "year") until.setFullYear(until.getFullYear() + 1);
    else until.setMonth(until.getMonth() + 1);

    await tx.update(store).set({ plan: p.plan, planExpiresAt: until, updatedAt: now }).where(eq(store.id, p.storeId));
    const [paid] = await tx
      .update(payments)
      .set({ status: "paid", confirmedBy, note, paidAt: now })
      .where(eq(payments.id, p.id))
      .returning();
    bust(storeTag(p.storeId));
    return paid;
  });
}

export const billingRouter = router({
  // Plan, trial, the open request (if any) and paid history — for the owner.
  status: protectedProcedure.query(async ({ ctx }) => {
    const s = await getStore();
    const [pending, history] = await Promise.all([
      db.select().from(payments).where(open(ctx.user.storeId)).orderBy(desc(payments.createdAt)).limit(1),
      db
        .select({ id: payments.id, reference: payments.reference, plan: payments.plan, period: payments.period, amount: payments.amount, paidAt: payments.paidAt })
        .from(payments)
        .where(and(eq(payments.storeId, ctx.user.storeId), eq(payments.status, "paid")))
        .orderBy(desc(payments.paidAt))
        .limit(12),
    ]);
    return {
      ...planStatus(s),
      pending: pending[0] ?? null,
      history,
      // Where to send the money. Unset = WhatsApp only.
      payTo: process.env.PLATFORM_UPI_ID ? { upiId: process.env.PLATFORM_UPI_ID, upiName: process.env.PLATFORM_UPI_NAME ?? "Fizz" } : null,
    };
  }),

  // One open request at a time; asking again replaces it (changed their mind
  // on the period, say) so the reference they quote is always the live one.
  request: adminProcedure.input(planRequestInput).mutation(async ({ ctx, input }) => {
    const row = await db.transaction(async (tx) => {
      await tx.update(payments).set({ status: "cancelled" }).where(open(ctx.user.storeId));
      const [created] = await tx
        .insert(payments)
        .values({ storeId: ctx.user.storeId, reference: reference(), plan: input.plan, period: input.period, amount: planByKey(input.plan).price[input.period] })
        .returning();
      return created;
    });
    revalidatePath("/dashboard/billing");
    return row;
  }),

  cancelRequest: adminProcedure.mutation(async ({ ctx }) => {
    await db.update(payments).set({ status: "cancelled" }).where(open(ctx.user.storeId));
    revalidatePath("/dashboard/billing");
    return { ok: true as const };
  }),

  // ---- Fizz operators -------------------------------------------------------
  // Every store with its plan state and open request, newest request first.
  stores: platformProcedure.query(async () => {
    const rows = await db
      .select({
        id: store.id,
        name: store.name,
        city: store.city,
        plan: store.plan,
        planExpiresAt: store.planExpiresAt,
        trialEndsAt: store.trialEndsAt,
        createdAt: store.createdAt,
        owner: sql<string | null>`(select email from users u where u.store_id = ${store.id} and u.role = 'admin' order by created_at limit 1)`,
        members: sql<number>`(select count(*)::int from users u where u.store_id = ${store.id})`,
      })
      .from(store)
      .orderBy(desc(store.createdAt));
    const requests = await db.select().from(payments).where(eq(payments.status, "requested"));
    const byStore = new Map(requests.map((r) => [r.storeId, r]));
    return rows
      .map((r) => ({ ...r, status: planStatus(r), request: byStore.get(r.id) ?? null }))
      .sort((a, b) => Number(!!b.request) - Number(!!a.request));
  }),

  confirm: platformProcedure.input(confirmPaymentInput).mutation(async ({ ctx, input }) => {
    const paid = await activate(input.id, ctx.user.id, input.note);
    revalidatePath("/", "layout");
    return paid;
  }),

  reject: platformProcedure.input(confirmPaymentInput.pick({ id: true })).mutation(async ({ input }) => {
    await db.update(payments).set({ status: "cancelled" }).where(and(eq(payments.id, input.id), eq(payments.status, "requested")));
    revalidatePath("/dashboard/platform");
    return { ok: true as const };
  }),

  // Comp, extend or drop a plan without a payment row.
  setPlan: platformProcedure.input(setPlanInput).mutation(async ({ input }) => {
    const until = input.plan === "free" ? null : input.until ? new Date(`${input.until}T23:59:59`) : null;
    if (input.plan !== "free" && !until) throw new TRPCError({ code: "BAD_REQUEST", message: "Pick an end date." });
    const [hit] = await db
      .update(store)
      .set({ plan: input.plan, planExpiresAt: until, updatedAt: new Date() })
      .where(eq(store.id, input.storeId))
      .returning({ id: store.id });
    if (!hit) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown store." });
    bust(storeTag(input.storeId));
    revalidatePath("/", "layout");
    return { ok: true as const };
  }),
});

