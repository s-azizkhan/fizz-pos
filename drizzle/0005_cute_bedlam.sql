ALTER TABLE "store" ADD COLUMN "upi_id" text;--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "upi_name" text;--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "menu_ordering" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "menu_whatsapp" text;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "diet" text;