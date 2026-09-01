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

// --- Invites -----------------------------------------------------------------
// No mail transport yet, so an invite is just a shareable link the admin copies
// and sends by hand. The admin picks email + role; the invitee sets their own
// name + password when they open the link.
// ponytail: token stored raw so a pending link can be re-copied later. Hash it
// if DB-read-only leaks become part of the threat model (kills re-copy).
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  role: userRole("role").notNull().default("staff"),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by").references(() => users.id, {
    onDelete: "set null",
  }),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Invite = typeof invites.$inferSelect;

export const inviteSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  role: z.enum(userRole.enumValues).default("staff"),
});
export type InviteInput = z.infer<typeof inviteSchema>;

// The invitee's half of the deal: identity + credentials, never the role.
export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1, "Enter your name").max(120),
  password: createUserSchema.shape.password,
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const updateRoleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(userRole.enumValues),
});
