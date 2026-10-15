ALTER TABLE "store" ADD COLUMN "menu_domain" text;--> statement-breakpoint
ALTER TABLE "store" ADD CONSTRAINT "store_menu_domain_unique" UNIQUE("menu_domain");