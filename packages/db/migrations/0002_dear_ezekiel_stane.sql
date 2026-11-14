ALTER TABLE "milestones" ADD COLUMN "reviewer_comment_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "reviewer_comment_url" text;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "thread_title" text;