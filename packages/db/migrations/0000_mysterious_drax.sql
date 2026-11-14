CREATE TYPE "public"."replay_status" AS ENUM('queued', 'running', 'finished', 'error');--> statement-breakpoint
CREATE TYPE "public"."replay_target" AS ENUM('base', 'patch');--> statement-breakpoint
CREATE TYPE "public"."ask_severity" AS ENUM('blocks_payment', 'nit', 'unclear');--> statement-breakpoint
CREATE TABLE "asks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"quote" text NOT NULL,
	"summary" text NOT NULL,
	"severity" "ask_severity" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "command_results" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"replay_id" uuid NOT NULL,
	"step" integer NOT NULL,
	"name" text NOT NULL,
	"command" text NOT NULL,
	"network" text NOT NULL,
	"exit_code" integer,
	"timed_out" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer NOT NULL,
	"output_tail" text NOT NULL,
	"output_sha256" text NOT NULL,
	"output_bytes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"ask_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"client_request_id" text NOT NULL,
	"market_job_id" text,
	"agent_id" text NOT NULL,
	"price_cents" integer NOT NULL,
	"mandate_id" uuid,
	"approval_url" text,
	"status" text NOT NULL,
	"auto_accept_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mandates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"per_job_cap_cents" integer NOT NULL,
	"total_cap_cents" integer NOT NULL,
	"spent_cents" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_url" text NOT NULL,
	"thread_repo" text NOT NULL,
	"code_repo_url" text,
	"pinned_sha" text,
	"reviewer_comment_id" text,
	"reviewer_comment_body" text,
	"reviewer_login" text,
	"owner_login" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"target" "replay_target" NOT NULL,
	"job_id" uuid,
	"sha" text NOT NULL,
	"image" text NOT NULL,
	"steps" jsonb NOT NULL,
	"patch" text,
	"status" "replay_status" DEFAULT 'queued' NOT NULL,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"milestone_id" uuid NOT NULL,
	"event" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"dedupe_key" text,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"last_error" text,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asks" ADD CONSTRAINT "asks_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_results" ADD CONSTRAINT "command_results_replay_id_replays_id_fk" FOREIGN KEY ("replay_id") REFERENCES "public"."replays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_ask_id_asks_id_fk" FOREIGN KEY ("ask_id") REFERENCES "public"."asks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replays" ADD CONSTRAINT "replays_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_events" ADD CONSTRAINT "run_events_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "command_results_step_idx" ON "command_results" USING btree ("replay_id","step");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_client_request_idx" ON "jobs" USING btree ("client_request_id");--> statement-breakpoint
CREATE INDEX "run_events_milestone_idx" ON "run_events" USING btree ("milestone_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_dedupe_idx" ON "tasks" USING btree ("dedupe_key") WHERE "tasks"."dedupe_key" is not null and "tasks"."done_at" is null;--> statement-breakpoint
CREATE INDEX "tasks_ready_idx" ON "tasks" USING btree ("run_after") WHERE "tasks"."done_at" is null;