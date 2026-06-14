CREATE TYPE "public"."expense_method" AS ENUM('cash', 'online', 'credit', 'other');--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"expense_date" date NOT NULL,
	"category" text DEFAULT 'Other' NOT NULL,
	"description" text,
	"amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_method" "expense_method" DEFAULT 'cash' NOT NULL,
	"vendor" text,
	"entered_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;