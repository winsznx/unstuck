import "server-only";
import { and, desc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { jobs, mandates } from "@unstuck/db";
import { db } from "./db";
import { startFixCheck } from "./fix-check";
import type { NewJob, OpenJob } from "./market-hire";
import { reconcileWith, type JobStore, type TrackedJob } from "./market-reconcile";
import { currentSession, logMarket, withMarket } from "./market-session";

const FOLLOWED = ["sent", "accepted", "working"];

export async function insertJob(job: NewJob): Promise<void> {
  await db().transaction(async (tx) => {
    const [{ count } = { count: 0 }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(jobs)
      .where(eq(jobs.milestoneId, job.milestoneId));
    await tx.insert(jobs).values({ ...job, attempt: count + 1, status: "sent" });
  });
}

export async function openJobFor(milestoneId: string): Promise<OpenJob | null> {
  const [row] = await db()
    .select({ status: jobs.status, approvalUrl: jobs.approvalUrl, priceCents: jobs.priceCents, agentName: jobs.agentName, agentId: jobs.agentId })
    .from(jobs)
    .where(and(eq(jobs.milestoneId, milestoneId), notInArray(jobs.status, ["failed", "refunded"])))
    .orderBy(desc(jobs.createdAt))
    .limit(1);
  return row ?? null;
}

const store: JobStore = {
  async followed(milestoneId, handle) {
    const rows = await db()
      .select({ job: jobs })
      .from(jobs)
      .innerJoin(mandates, eq(jobs.mandateId, mandates.id))
      .where(and(eq(jobs.milestoneId, milestoneId), eq(mandates.marketHandle, handle), inArray(jobs.status, FOLLOWED)))
      .orderBy(desc(jobs.createdAt));
    return rows.map(({ job }): TrackedJob => ({
      id: job.id,
      clientRequestId: job.clientRequestId,
      marketJobId: job.marketJobId,
      agentId: job.agentId,
      priceCents: job.priceCents,
      mandateId: job.mandateId,
      status: job.status,
      title: job.title,
      brief: job.brief,
      autoAcceptAt: job.autoAcceptAt,
    }));
  },

  async markFunded(job, marketJobId) {
    return db().transaction(async (tx) => {
      const claimed = await tx
        .update(jobs)
        .set({ marketJobId, status: "accepted" })
        .where(and(eq(jobs.id, job.id), isNull(jobs.marketJobId)))
        .returning({ id: jobs.id });
      if (claimed.length === 0) return false;
      if (job.mandateId) {
        await tx
          .update(mandates)
          .set({ spentCents: sql`${mandates.spentCents} + ${job.priceCents}` })
          .where(eq(mandates.id, job.mandateId));
      }
      return true;
    });
  },

  async setStatus(jobId, status, autoAcceptAt) {
    await db()
      .update(jobs)
      .set({ status, autoAcceptAt })
      .where(and(eq(jobs.id, jobId), inArray(jobs.status, FOLLOWED)));
  },

  async claimDelivery(jobId, autoAcceptAt) {
    const claimed = await db()
      .update(jobs)
      .set({ status: "delivered", autoAcceptAt })
      .where(and(eq(jobs.id, jobId), inArray(jobs.status, FOLLOWED), isNull(jobs.fixReplayId)))
      .returning({ id: jobs.id });
    return claimed.length > 0;
  },

  async setFixReplay(jobId, replayId) {
    await db().update(jobs).set({ fixReplayId: replayId }).where(and(eq(jobs.id, jobId), isNull(jobs.fixReplayId)));
  },
};

/**
 * Follows the viewer's hires on this milestone on Agent Market and starts the fix check once an agent delivers.
 * Runs only for a signed-in viewer, and only for jobs hired under their own handle. Never throws: a page render
 * must not fail because the market didn't answer.
 */
export async function reconcileJobs(milestoneId: string): Promise<void> {
  try {
    const session = await currentSession();
    if (!session) return;
    const followed = await store.followed(milestoneId, session.handle);
    if (followed.length === 0) return;
    await withMarket(session, (market) => reconcileWith({ store, market, startFixCheck, log: logMarket }, milestoneId, followed));
  } catch (error) {
    logMarket("reconcile failed", error);
  }
}
