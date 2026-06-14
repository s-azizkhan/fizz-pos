import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  cafeName: text("cafe_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Base insert schema derived from the table, narrowed to the fields the form sends.
const baseInsert = createInsertSchema(waitlist).pick({ email: true, cafeName: true });

// Form-facing schema: enforce a real email, allow café name to be empty/absent.
export const waitlistForm = baseInsert.extend({
  email: z.email("Enter a valid email"),
  cafeName: z.string().trim().max(120).nullish(),
});

export type WaitlistInput = z.infer<typeof waitlistForm>;
