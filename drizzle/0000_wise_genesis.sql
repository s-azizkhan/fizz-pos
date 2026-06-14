CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'staff');--> statement-breakpoint
CREATE TABLE "daily_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_date" date NOT NULL,
	"cash_sale" numeric(12, 2) DEFAULT '0' NOT NULL,
	"online_sale" numeric(12, 2) DEFAULT '0' NOT NULL,
	"credit_sale" numeric(12, 2) DEFAULT '0' NOT NULL,
	"entered_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'staff' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "store" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'My Café' NOT NULL,
	"legal_name" text,
	"email" text,
	"phone" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text,
	"tax_id" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"opening_time" text DEFAULT '08:00' NOT NULL,
	"closing_time" text DEFAULT '18:00' NOT NULL,
	"invoice_prefix" text DEFAULT 'INV' NOT NULL,
	"order_prefix" text DEFAULT 'ORD' NOT NULL,
	"invoice_number_format" text DEFAULT '{PREFIX}-{SEQ:4}-{DDMMYYYY}' NOT NULL,
	"order_number_format" text DEFAULT '{PREFIX}-{SEQ:4}-{DDMMYYYY}' NOT NULL,
	"next_invoice_seq" integer DEFAULT 1 NOT NULL,
	"next_order_seq" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"cafe_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "daily_sales" ADD CONSTRAINT "daily_sales_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;