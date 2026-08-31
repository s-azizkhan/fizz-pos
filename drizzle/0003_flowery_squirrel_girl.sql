CREATE TYPE "public"."order_payment_method" AS ENUM('cash', 'card', 'online');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('open', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('dine_in', 'takeaway', 'delivery');--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid,
	"variant_id" uuid,
	"name" text NOT NULL,
	"variant_name" text,
	"unit_price" numeric(12, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"line_total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"number" text NOT NULL,
	"status" "order_status" DEFAULT 'open' NOT NULL,
	"type" "order_type" DEFAULT 'dine_in' NOT NULL,
	"reference" text,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(6, 3) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_method" "order_payment_method",
	"tendered" numeric(12, 2),
	"change_due" numeric(12, 2),
	"served_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "recipe_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"variant_id" uuid,
	"inventory_item_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	CONSTRAINT "recipe_components_unique" UNIQUE("menu_item_id","variant_id","inventory_item_id")
);
--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "tax_rate" numeric(6, 3) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "tax_label" text DEFAULT 'Tax' NOT NULL;--> statement-breakpoint
ALTER TABLE "store" ADD COLUMN "tax_inclusive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_item_variants" ADD COLUMN "cost" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "cost" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_served_by_users_id_fk" FOREIGN KEY ("served_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_variant_id_menu_item_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."menu_item_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_menu_item_id_idx" ON "order_items" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "orders_store_status_idx" ON "orders" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "orders_store_paid_at_idx" ON "orders" USING btree ("store_id","paid_at");--> statement-breakpoint
CREATE INDEX "orders_store_created_at_idx" ON "orders" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "recipe_components_menu_item_idx" ON "recipe_components" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "recipe_components_inventory_item_idx" ON "recipe_components" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "daily_sales_store_date_idx" ON "daily_sales" USING btree ("store_id","sale_date");--> statement-breakpoint
CREATE INDEX "expenses_store_date_idx" ON "expenses" USING btree ("store_id","expense_date");--> statement-breakpoint
CREATE INDEX "menu_categories_store_idx" ON "menu_categories" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "menu_item_variants_item_idx" ON "menu_item_variants" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "menu_items_category_idx" ON "menu_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "inventory_items_store_idx" ON "inventory_items" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "stock_movements_item_idx" ON "stock_movements" USING btree ("item_id");