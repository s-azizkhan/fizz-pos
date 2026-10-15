import { sql } from "drizzle-orm";
import { boolean, check, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { store } from "./store";

// Roles for the shop floor. `admin` owns everything; `manager` runs a shift;
// `staff` rings orders. Order matters — first value is the column default.
export const userRole = pgEnum("user_role", ["admin", "manager", "staff"]);
export type UserRole = (typeof userRole.enumValues)[number];

// Identity is an email OR a phone (many counter staff have no email). Both
// are global, not per-store: one contact = one account = one counter. Phone
// is stored canonical: digits only with country code, e.g. 919876543210.
export const users = pgTable(
  "users",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  // The counter this person works at. Every authed read/write is scoped by it.
  storeId: uuid("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  email: text("email").unique(),
  phone: text("phone").unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("staff"),
  // Fizz operator: confirms payments, sets plans across every store. Never
  // settable from the app — only the seeder (npm run db:seed) or SQL flips it.
  // A DB flag, not an email allowlist: emails are unverified, so a list in env
  // could be claimed by whoever registers that address first.
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [check("users_contact_chk", sql`${t.email} is not null or ${t.phone} is not null`)],
);

export type User = typeof users.$inferSelect;

// --- Contact: one field, email or phone ---------------------------------------
export type Contact = { email: string | null; phone: string | null };

// Canonical phone: digits only, country code included. A bare 10-digit
// number is Indian (the counters we serve); anything else must bring its
// own code. null = not a phone.
export function canonicalPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (/^0\d{10}$/.test(d)) d = d.slice(1); // 09876543210
  if (/^\d{10}$/.test(d)) d = "91" + d;
  return /^\d{11,15}$/.test(d) ? d : null;
}

// "+91 98765 43210" for Indian numbers, "+<digits>" otherwise.
export function formatPhone(p: string): string {
  return /^91\d{10}$/.test(p) ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : `+${p}`;
}

export function parseContact(raw: string): Contact | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.includes("@")) {
    const r = z.email().safeParse(v.toLowerCase());
    return r.success ? { email: r.data, phone: null } : null;
  }
  const phone = canonicalPhone(v);
  return phone ? { email: null, phone } : null;
}

export const contactLabel = (c: Contact) => c.email ?? (c.phone ? formatPhone(c.phone) : "");

export const contactSchema = z
  .string()
  .trim()
  .min(1, "Enter an email or phone number")
  .transform((v, ctx) => {
    const c = parseContact(v);
    if (c) return c;
    ctx.addIssue({ code: "custom", message: "Enter a valid email or a phone number with country code" });
    return z.NEVER;
  });

// Login is contact + password only — never trust a role/hash from the client.
export const loginForm = z.object({
  identifier: contactSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginForm>;

// Server-side schema for minting a user (seeder, future admin invite flow).
const baseUserInsert = createInsertSchema(users).pick({
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

// Owner signup: creates a brand-new store and its first `admin` in one go.
// Everyone else at that counter arrives through an invite link.
export const signupForm = z.object({
  storeName: z.string().trim().min(1, "Name your counter").max(120),
  name: z.string().trim().min(1, "Enter your name").max(120),
  contact: contactSchema,
  password: createUserSchema.shape.password,
});
export type SignupInput = z.infer<typeof signupForm>;

// --- Invites -----------------------------------------------------------------
// No mail transport yet, so an invite is just a shareable link the admin copies
// and sends by hand. The admin picks a contact (email or phone) + role; the
// invitee sets their own name + password when they open the link.
// ponytail: token stored raw so a pending link can be re-copied later. Hash it
// if DB-read-only leaks become part of the threat model (kills re-copy).
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => store.id, { onDelete: "cascade" }),
  email: text("email"),
  phone: text("phone"),
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
  contact: contactSchema,
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
