import { date, integer, numeric, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./user";

// How an expense was paid. First value is the column default.
export const expenseMethod = pgEnum("expense_method", ["cash", "online", "credit", "other"]);
export type ExpenseMethod = (typeof expenseMethod.enumValues)[number];

// Spend categories for the café floor. Keep broad — descriptions add detail.
export const EXPENSE_CATEGORIES = [
  "Inventory",
  "Supplies",
  "Rent",
  "Utilities",
  "Payroll",
  "Marketing",
  "Maintenance",
  "Equipment",
  "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// One row per expense. Money stored as numeric(12,2) strings to avoid drift.
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  expenseDate: date("expense_date").notNull(),
  category: text("category").notNull().default("Other"),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: expenseMethod("payment_method").notNull().default("cash"),
  vendor: text("vendor"),
  // Who keyed the entry. Keep history even if the user is later removed.
  enteredBy: integer("entered_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Soft delete — null means active.
  deletedAt: timestamp("deleted_at"),
});

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
