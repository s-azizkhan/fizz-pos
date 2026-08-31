CREATE TABLE "order_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"ordering" boolean DEFAULT false NOT NULL,
	"whatsapp" text,
	"dine_in" boolean DEFAULT true NOT NULL,
	"takeaway" boolean DEFAULT true NOT NULL,
	"delivery" boolean DEFAULT false NOT NULL,
	"delivery_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_settings_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
ALTER TABLE "order_settings" ADD CONSTRAINT "order_settings_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store" DROP COLUMN "menu_ordering";--> statement-breakpoint
ALTER TABLE "store" DROP COLUMN "menu_whatsapp";