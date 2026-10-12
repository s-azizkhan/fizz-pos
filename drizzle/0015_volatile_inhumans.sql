CREATE TYPE "public"."order_source" AS ENUM('counter', 'phone', 'whatsapp', 'web', 'zomato', 'swiggy', 'other');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "source" "order_source" DEFAULT 'counter' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "web_pending" boolean DEFAULT false NOT NULL;