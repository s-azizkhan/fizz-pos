import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Indian counter owners live on WhatsApp, not email: phone is the key,
// email is optional.
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(),
  email: text("email").unique(),
  cafeName: text("cafe_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Base insert schema derived from the table, narrowed to the fields the form sends.
const baseInsert = createInsertSchema(waitlist).pick({ email: true, cafeName: true, phone: true });

// Form-facing schema: a real Indian mobile number (normalised to +91XXXXXXXXXX),
// optional email, optional outlet name.
export const waitlistForm = baseInsert.extend({
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s\-()]/g, "").replace(/^(\+?91|0)(?=[6-9]\d{9}$)/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"))
    .transform((s) => `+91${s}`),
  email: z.union([z.literal(""), z.email("Enter a valid email")]).nullish(),
  cafeName: z.string().trim().max(120).nullish(),
});

export type WaitlistInput = z.infer<typeof waitlistForm>;
