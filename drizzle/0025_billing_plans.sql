CREATE TYPE "public"."payment_status" AS ENUM('requested', 'paid', 'cancelled');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"plan" text NOT NULL,
	"period" text NOT NULL,
	"amount" integer NOT NULL,
	"status" "payment_status" DEFAULT 'requested' NOT NULL,
	"note" text,
	"confirmed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	CONSTRAINT "payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "plan_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_store_idx" ON "payments" USING btree ("store_id","created_at");--> statement-breakpoint
-- Counters that existed before billing keep everything they had: a year of Counter.
UPDATE "store" SET "plan" = 'counter', "plan_expires_at" = now() + interval '1 year' WHERE "plan_expires_at" IS NULL AND "trial_ends_at" IS NULL;
