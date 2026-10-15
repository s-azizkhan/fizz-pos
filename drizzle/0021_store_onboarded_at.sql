ALTER TABLE "store" ADD COLUMN "onboarded_at" timestamp;--> statement-breakpoint
-- Existing counters are already configured; only fresh stores see the wizard.
UPDATE "store" SET "onboarded_at" = now();
