import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";
import { CURRENCY_CODES } from "@/lib/store/currencies";

// Single café = single store row (id = 1). Holds profile + invoice/hours config.
export const store = pgTable("store", {
  id: serial("id").primaryKey(),
  // Profile
  name: text("name").notNull().default("My Café"),
  legalName: text("legal_name"),
  email: text("email"),
  phone: text("phone"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  taxId: text("tax_id"),
  timezone: text("timezone").notNull().default("UTC"),
  currency: text("currency").notNull().default("USD"),
  // Hours (HH:MM, store-local)
  openingTime: text("opening_time").notNull().default("08:00"),
  closingTime: text("closing_time").notNull().default("18:00"),
  // Document numbering. Templates use tokens: {PREFIX} {SEQ} {SEQ:4} {DD} {MM}
  // {YYYY} {YY} {DDMMYYYY} {DDMMYY} {YYYYMMDD}. {AUTO} aliases {SEQ}.
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  orderPrefix: text("order_prefix").notNull().default("ORD"),
  invoiceNumberFormat: text("invoice_number_format")
    .notNull()
    .default("{PREFIX}-{SEQ:4}-{DDMMYYYY}"),
  orderNumberFormat: text("order_number_format")
    .notNull()
    .default("{PREFIX}-{SEQ:4}-{DDMMYYYY}"),
  nextInvoiceSeq: integer("next_invoice_seq").notNull().default(1),
  nextOrderSeq: integer("next_order_seq").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Store = typeof store.$inferSelect;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || null);

// Admin-facing update schema. Profile fields optional; config fields validated.
export const storeSettingsForm = z.object({
  name: z.string().trim().min(1, "Store name is required").max(120),
  legalName: optionalText(160),
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null)
    .refine((v) => v === null || z.email().safeParse(v).success, "Enter a valid email"),
  phone: optionalText(40),
  addressLine1: optionalText(160),
  addressLine2: optionalText(160),
  city: optionalText(80),
  state: optionalText(80),
  postalCode: optionalText(20),
  country: optionalText(80),
  taxId: optionalText(60),
  timezone: z.string().trim().min(1).max(60),
  currency: z.enum(CURRENCY_CODES, "Pick a currency"),
  openingTime: z.string().regex(TIME_RE, "Use HH:MM (24h)"),
  closingTime: z.string().regex(TIME_RE, "Use HH:MM (24h)"),
  invoicePrefix: z.string().trim().min(1).max(12),
  orderPrefix: z.string().trim().min(1).max(12),
  invoiceNumberFormat: z.string().trim().min(1).max(80),
  orderNumberFormat: z.string().trim().min(1).max(80),
  nextInvoiceSeq: z.coerce.number().int().min(1),
  nextOrderSeq: z.coerce.number().int().min(1),
});
export type StoreSettingsInput = z.infer<typeof storeSettingsForm>;
