-- Rows from before phone became the key: keep them, fall back to email as the contact.
UPDATE "waitlist" SET "phone" = "email" WHERE "phone" IS NULL;--> statement-breakpoint
ALTER TABLE "waitlist" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist" ALTER COLUMN "phone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_phone_unique" UNIQUE("phone");