import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { store } from "./store";
import { users } from "./user";
import { PLAN_KEYS } from "@/lib/store/plans";

// Offline billing. An owner REQUESTS a plan from the Billing page; Fizz takes
// the money outside the app (UPI / cash / bank), then a platform admin
// CONFIRMS the request on /dashboard/platform and the plan activates. The
// `reference` is what the owner quotes with their payment.
export const paymentStatus = pgEnum("payment_status", ["requested", "paid", "cancelled"]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => store.id, { onDelete: "cascade" }),
    reference: text("reference").notNull().unique(), // FZ-XXXXXX, quoted on the transfer
    plan: text("plan").notNull(),
    period: text("period").notNull(), // month | year
    amount: integer("amount").notNull(), // paise
    status: paymentStatus("status").notNull().default("requested"),
    note: text("note"), // how it was paid, txn id — free text from the confirmer
    confirmedBy: uuid("confirmed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [index("payments_store_idx").on(t.storeId, t.createdAt)],
);
export type Payment = typeof payments.$inferSelect;

export const planRequestInput = z.object({
  plan: z.enum(PLAN_KEYS).refine((p) => p !== "free", "Pick a paid plan"),
  period: z.enum(["month", "year"]),
});

export const confirmPaymentInput = z.object({
  id: z.uuid(),
  note: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => v || null),
});

// Platform override: comp a plan, extend, or drop a store to free.
export const setPlanInput = z.object({
  storeId: z.uuid(),
  plan: z.enum(PLAN_KEYS),
  // Date input (YYYY-MM-DD); ignored for free.
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});
