CREATE TABLE "market_clients" (
	"issuer" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" text NOT NULL,
	"near_account_id" text,
	"email_verified" boolean,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text,
	"access_expires_at" timestamp with time zone,
	"scopes" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "agent_name" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "brief" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "fix_replay_id" uuid;--> statement-breakpoint
ALTER TABLE "mandates" ADD COLUMN "market_handle" text;--> statement-breakpoint
CREATE INDEX "market_sessions_handle_idx" ON "market_sessions" USING btree ("handle");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_fix_replay_id_replays_id_fk" FOREIGN KEY ("fix_replay_id") REFERENCES "public"."replays"("id") ON DELETE no action ON UPDATE no action;