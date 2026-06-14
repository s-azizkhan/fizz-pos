import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
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
  // Public menu page. `menuSlug` is the shareable URL token; null = not shared.
  menuSlug: text("menu_slug").unique(),
  menuPublished: boolean("menu_published").notNull().default(false),
  menuTagline: text("menu_tagline"),
  menuFont: text("menu_font").notNull().default("sans"),
  menuFontScale: text("menu_font_scale").notNull().default("md"),
  menuAccent: text("menu_accent").notNull().default("#C6F432"),
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

// Public menu page customization. Fonts/scales are constrained to keep the
// public renderer simple and SSR-safe.
export const MENU_FONTS = ["sans", "display", "serif", "mono"] as const;
export type MenuFont = (typeof MENU_FONTS)[number];
export const MENU_FONT_SCALES = ["sm", "md", "lg"] as const;
export type MenuFontScale = (typeof MENU_FONT_SCALES)[number];

export const menuAppearanceForm = z.object({
  menuPublished: z.coerce.boolean().default(false),
  menuSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "At least 2 characters")
    .max(48)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and dashes only"),
  menuTagline: optionalText(160),
  menuFont: z.enum(MENU_FONTS, "Pick a font"),
  menuFontScale: z.enum(MENU_FONT_SCALES, "Pick a size"),
  menuAccent: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #C6F432"),
});
export type MenuAppearanceInput = z.infer<typeof menuAppearanceForm>;
