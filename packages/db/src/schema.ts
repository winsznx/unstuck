import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { RunEvent } from "@unstuck/core";

export interface ReplayStepSpec {
  name: string;
  command: string;
  network: "none" | "bridge";
  timeoutMs: number;
  stopOnFail: boolean;
  askId?: string;
}

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const milestones = pgTable("milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadUrl: text("thread_url").notNull(),
  threadRepo: text("thread_repo").notNull(),
  codeRepoUrl: text("code_repo_url"),
  pinnedSha: text("pinned_sha"),
  reviewerCommentId: text("reviewer_comment_id"),
  reviewerCommentBody: text("reviewer_comment_body"),
  reviewerLogin: text("reviewer_login"),
  reviewerCommentAt: timestamp("reviewer_comment_at", { withTimezone: true }),
  reviewerCommentUrl: text("reviewer_comment_url"),
  threadTitle: text("thread_title"),
  ownerLogin: text("owner_login"),
  createdAt: createdAt(),
});

export const runEvents = pgTable(
  "run_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    milestoneId: uuid("milestone_id").notNull().references(() => milestones.id),
    event: jsonb("event").$type<RunEvent>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("run_events_milestone_idx").on(t.milestoneId, t.id)],
);

export const severity = pgEnum("ask_severity", ["blocks_payment", "nit", "unclear"]);

export const asks = pgTable("asks", {
  id: uuid("id").primaryKey().defaultRandom(),
  milestoneId: uuid("milestone_id").notNull().references(() => milestones.id),
  quote: text("quote").notNull(),
  summary: text("summary").notNull(),
  severity: severity("severity").notNull(),
  source: text("source").notNull().default("owner"),
  quoteStart: integer("quote_start"),
  createdAt: createdAt(),
});

export const replayTarget = pgEnum("replay_target", ["base", "patch"]);
export const replayStatus = pgEnum("replay_status", ["queued", "running", "finished", "error"]);

export const replays = pgTable("replays", {
  id: uuid("id").primaryKey().defaultRandom(),
  milestoneId: uuid("milestone_id").notNull().references(() => milestones.id),
  target: replayTarget("target").notNull(),
  jobId: uuid("job_id"),
  sha: text("sha").notNull(),
  image: text("image").notNull(),
  steps: jsonb("steps").$type<ReplayStepSpec[]>().notNull(),
  patch: text("patch"),
  status: replayStatus("status").notNull().default("queued"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const commandResults = pgTable(
  "command_results",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    replayId: uuid("replay_id").notNull().references(() => replays.id),
    step: integer("step").notNull(),
    name: text("name").notNull(),
    command: text("command").notNull(),
    network: text("network").notNull(),
    exitCode: integer("exit_code"),
    timedOut: integer("timed_out").notNull().default(0),
    durationMs: integer("duration_ms").notNull(),
    outputTail: text("output_tail").notNull(),
    outputSha256: text("output_sha256").notNull(),
    outputBytes: integer("output_bytes").notNull(),
  },
  (t) => [uniqueIndex("command_results_step_idx").on(t.replayId, t.step)],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    milestoneId: uuid("milestone_id").notNull().references(() => milestones.id),
    askId: uuid("ask_id").notNull().references(() => asks.id),
    attempt: integer("attempt").notNull(),
    clientRequestId: text("client_request_id").notNull(),
    marketJobId: text("market_job_id"),
    agentId: text("agent_id").notNull(),
    priceCents: integer("price_cents").notNull(),
    mandateId: uuid("mandate_id"),
    approvalUrl: text("approval_url"),
    status: text("status").notNull(),
    autoAcceptAt: timestamp("auto_accept_at", { withTimezone: true }),
    /** The agent's display name at hire, so screens don't show its id. */
    agentName: text("agent_name"),
    /** The title and brief sent with MARKET_PREPARE_JOB. A replay under the same client_request_id must repeat them exactly. */
    title: text("title"),
    brief: text("brief"),
    /** The patch replay started from the agent's delivery. Set once, so a delivery is checked once. */
    fixReplayId: uuid("fix_replay_id").references(() => replays.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("jobs_client_request_idx").on(t.clientRequestId)],
);

export const mandates = pgTable("mandates", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** The Agent Market handle the limit was set by. Hires spend only from a limit under the signed-in handle. */
  marketHandle: text("market_handle"),
  perJobCapCents: integer("per_job_cap_cents").notNull(),
  totalCapCents: integer("total_cap_cents").notNull(),
  spentCents: integer("spent_cents").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** One OAuth client registration per authorization server, made lazily at the first sign-in. Public client: no secret. */
export const marketClients = pgTable("market_clients", {
  issuer: text("issuer").primaryKey(),
  clientId: text("client_id").notNull(),
  createdAt: createdAt(),
});

/** A signed-in Agent Market owner. Tokens are AES-256-GCM sealed with MARKET_TOKEN_KEY; the cookie holds only the id. */
export const marketSessions = pgTable(
  "market_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    handle: text("handle").notNull(),
    nearAccountId: text("near_account_id"),
    emailVerified: boolean("email_verified"),
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc"),
    accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
    scopes: text("scopes").array().notNull(),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("market_sessions_handle_idx").on(t.handle)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    dedupeKey: text("dedupe_key"),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lastError: text("last_error"),
    doneAt: timestamp("done_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("tasks_dedupe_idx").on(t.dedupeKey).where(sql`${t.dedupeKey} is not null and ${t.doneAt} is null`),
    index("tasks_ready_idx").on(t.runAfter).where(sql`${t.doneAt} is null`),
  ],
);
