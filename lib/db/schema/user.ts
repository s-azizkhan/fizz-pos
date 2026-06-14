import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Roles for the café floor. `admin` owns everything; `manager` runs a shift;
// `staff` rings orders. Order matters — first value is the column default.
export const userRole = pgEnum("user_role", ["admin", "manager", "staff"]);
export type UserRole = (typeof userRole.enumValues)[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("staff"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;

// Login is email + password only — never trust a role/hash from the client.
export const loginForm = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginForm>;

// Server-side schema for minting a user (seeder, future admin invite flow).
const baseUserInsert = createInsertSchema(users).pick({
  email: true,
  name: true,
  role: true,
});
export const createUserSchema = baseUserInsert.extend({
  email: z.email().trim().toLowerCase(),
  name: z.string().trim().min(1).max(120),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[a-z]/i, "At least one letter")
    .regex(/[0-9]/, "At least one number"),
  role: z.enum(userRole.enumValues).default("staff"),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
