CREATE TYPE "public"."inventory_unit" AS ENUM('each', 'g', 'kg', 'ml', 'l', 'pack', 'box', 'bag');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('receive', 'waste', 'sale', 'adjust');--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"category" text DEFAULT 'Other' NOT NULL,
	"unit" "inventory_unit" DEFAULT 'each' NOT NULL,
	"quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"reorder_level" numeric(14, 3) DEFAULT '0' NOT NULL,
	"cost_per_unit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"supplier" text,
	"entered_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"delta" numeric(14, 3) NOT NULL,
	"resulting" numeric(14, 3) NOT NULL,
	"note" text,
	"entered_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;