CREATE TYPE "public"."kitchen_status" AS ENUM('new', 'accepted', 'ready');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "kitchen_status" "kitchen_status" DEFAULT 'new' NOT NULL;--> statement-breakpoint
CREATE INDEX "orders_store_kitchen_status_idx" ON "orders" USING btree ("store_id","kitchen_status");--> statement-breakpoint
-- Backfill: every order that already existed was cooked and served long before
-- this board did. Without this they'd all land in the "new" lane and bury the
-- real queue on first load.
UPDATE "orders" SET "kitchen_status" = 'ready';
