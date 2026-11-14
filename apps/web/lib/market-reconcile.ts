import { MarketRefusal, type JobResult, type MarketMcp } from "@unstuck/integrations/agent-market";
import type { JobStatus } from "./fix-shared";

/**
 * Following a hire on Agent Market, written against a small store so the rules can be tested without a database.
 * lib/market-jobs.ts passes the real one.
 */

export interface TrackedJob {
  id: string;
  clientRequestId: string;
  marketJobId: string | null;
  agentId: string;
  priceCents: number;
  mandateId: string | null;
  status: string;
  title: string | null;
  brief: string | null;
  autoAcceptAt: Date | null;
}

export interface JobStore {
  followed(milestoneId: string, handle: string): Promise<TrackedJob[]>;
  /** Stores the market's job id and adds the price to the limit's spend. False when another request got there first. */
  markFunded(job: TrackedJob, marketJobId: string): Promise<boolean>;
  setStatus(jobId: string, status: JobStatus, autoAcceptAt: Date | null): Promise<void>;
  /** Moves the job to delivered. False when another request already did, so the fix check starts once. */
  claimDelivery(jobId: string, autoAcceptAt: Date | null): Promise<boolean>;
  setFixReplay(jobId: string, replayId: string): Promise<void>;
}

export interface ReconcileDeps {
  store: JobStore;
  market: Pick<MarketMcp, "prepareJob" | "jobStatus" | "jobResult">;
  startFixCheck: (milestoneId: string, fix: string) => Promise<{ ok: true; replayId: string } | { ok: false; error: string }>;
  log: (message: string, error?: unknown) => void;
}

/**
 * Agent Market's worker_state, read for UNSTUCK's job stages. A dispute counts as failed here: nothing is accepted
 * and the owner settles it on the job page. Matched on the start, since the market words some states with a dash.
 */
export function stageOf(workerState: string): JobStatus | null {
  const state = workerState.toLowerCase();
  if (state.startsWith("nobody hired")) return "accepted";
  if (state.startsWith("still working")) return "working";
  if (state.startsWith("delivered") || state.startsWith("some delivered") || state.startsWith("finished")) return "delivered";
  if (state.startsWith("cancelled")) return "refunded";
  if (state.startsWith("in dispute")) return "failed";
  return null;
}

const FIX_LINK = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(?:pull\/\d+|commit\/[0-9a-f]{7,40})\b/i;

export function findFixLink(text: string): string | null {
  return FIX_LINK.exec(text)?.[0] ?? null;
}

/** How many result pages to read looking for the link before giving up. A delivery note is short; a dump isn't read whole. */
const MAX_PAGES = 5;

async function deliveredLink(market: ReconcileDeps["market"], jobId: string): Promise<string | null> {
  let offset: number | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result: JobResult = await market.jobResult(jobId, offset);
    if (result.status === "external") return findFixLink(result.deliverableUrl);
    if (result.status === "unavailable") return null;
    const link = findFixLink(result.contentChunk);
    if (link || result.nextOffset === null) return link;
    offset = result.nextOffset;
  }
  return null;
}

async function follow(deps: ReconcileDeps, milestoneId: string, job: TrackedJob): Promise<void> {
  const { store, market } = deps;
  let marketJobId = job.marketJobId;

  if (!marketJobId) {
    if (job.title === null || job.brief === null) {
      deps.log(`reconcile: job ${job.id} has no stored brief to replay`);
      return;
    }
    const prepared = await market.prepareJob({ worker_agent_id: job.agentId, title: job.title, description: job.brief, client_request_id: job.clientRequestId });
    if (prepared.kind === "draft") return;
    marketJobId = prepared.jobId;
    await store.markFunded(job, marketJobId);
  }

  const status = await market.jobStatus(marketJobId);
  const stage = stageOf(status.workerState);

  if (status.resultAvailable) {
    const link = await deliveredLink(market, marketJobId);
    if (!(await store.claimDelivery(job.id, status.autoAcceptAt))) return;
    if (!link) {
      deps.log(`reconcile: job ${job.id} delivered without a GitHub pull request or commit link`);
      return;
    }
    const check = await deps.startFixCheck(milestoneId, link);
    if (check.ok) await store.setFixReplay(job.id, check.replayId);
    else deps.log(`reconcile: fix check for job ${job.id} didn't start: ${check.error}`);
    return;
  }

  // A delivery is only "delivered" here once its result is read and its check started; until then it's still working.
  const next = stage === "delivered" ? "working" : (stage ?? job.status);
  const changed = next !== job.status || status.autoAcceptAt?.getTime() !== job.autoAcceptAt?.getTime();
  if (changed && (next === "accepted" || next === "working" || next === "failed" || next === "refunded")) {
    await store.setStatus(job.id, next, status.autoAcceptAt);
  }
}

export async function reconcileWith(deps: ReconcileDeps, milestoneId: string, followed: readonly TrackedJob[]): Promise<void> {
  for (const job of followed) {
    try {
      await follow(deps, milestoneId, job);
    } catch (error) {
      if (error instanceof MarketRefusal && error.reason === "job_deleted") {
        await deps.store.setStatus(job.id, "refunded", null);
        continue;
      }
      deps.log(`reconcile: job ${job.id} couldn't be followed`, error);
    }
  }
}
