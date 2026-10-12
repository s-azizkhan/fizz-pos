import { date, index, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./user";
import { store } from "./store";
import { EXPENSE_CATEGORIES, EXPENSE_METHODS } from "./constants";

// How an expense was paid. Values (and categories) live in ./constants.
export const expenseMethod = pgEnum("expense_method", EXPENSE_METHODS);


// One row per expense. Money stored as numeric(12,2) strings to avoid drift.
export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  expenseDate: date("expense_date").notNull(),
  category: text("category").notNull().default("Other"),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: expenseMethod("payment_method").notNull().default("cash"),
  vendor: text("vendor"),
  // Who keyed the entry. Keep history even if the user is later removed.
  enteredBy: uuid("entered_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Soft delete — null means active.
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  // Expenses are listed and summed per store over a date window.
  index("expenses_store_date_idx").on(t.storeId, t.expenseDate),
]);

export type Expense = typeof expenses.$inferSelect;

const money = z
  .coerce.number({ error: "Enter a valid amount" })
  .min(0.01, "Must be greater than zero")
  .max(99999999.99, "Too large")
  .transform((n) => n.toFixed(2));

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || null);

export const expenseForm = z.object({
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  category: z.enum(EXPENSE_CATEGORIES, "Pick a category"),
  description: optionalText(280),
  amount: money,
  paymentMethod: z.enum(expenseMethod.enumValues, "Pick a payment method"),
  vendor: optionalText(120),
});
export type ExpenseInput = z.infer<typeof expenseForm>;
