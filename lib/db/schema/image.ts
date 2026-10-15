import { customType, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { store } from "./store";

// Uploaded images (logo, cover). Stored in Postgres — two small images per
// store don't justify an object store. Served at /api/img/<id>.
// ponytail: bytea in the DB; move to S3/R2 if stores start uploading galleries.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const images = pgTable("images", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => store.id, { onDelete: "cascade" }),
  // What it's for: "logo" | "cover". One live image per kind.
  kind: text("kind").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Image = typeof images.$inferSelect;

// A URL this app serves itself. Logo/cover fields accept these as well as https.
export const IMG_PATH = /^\/api\/img\/[0-9a-f-]{36}$/;
