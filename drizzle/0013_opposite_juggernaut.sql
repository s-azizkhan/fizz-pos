ALTER TABLE "orders" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_unique" UNIQUE("client_id");