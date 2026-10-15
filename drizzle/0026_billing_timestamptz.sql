ALTER TABLE "store" ALTER COLUMN "onboarded_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "store" ALTER COLUMN "plan_expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "store" ALTER COLUMN "trial_ends_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "paid_at" SET DATA TYPE timestamp with time zone;