ALTER TABLE "asks" ADD COLUMN "source" text DEFAULT 'owner' NOT NULL;--> statement-breakpoint
ALTER TABLE "asks" ADD COLUMN "quote_start" integer;