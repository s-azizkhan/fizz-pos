ALTER TABLE "invites" ADD COLUMN "store_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "store_id" uuid;--> statement-breakpoint
-- Everyone so far belonged to the one original store (lib/store/constants.ts STORE_ID).
UPDATE "users" SET "store_id" = '00000000-0000-0000-0000-000000000001' WHERE "store_id" IS NULL;--> statement-breakpoint
UPDATE "invites" SET "store_id" = '00000000-0000-0000-0000-000000000001' WHERE "store_id" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "store_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invites" ALTER COLUMN "store_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;
