"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { compareAsks, isJobStatus, latestPatch, queueGroup, type QueueGroup } from "@/lib/fix";
import { hire, type HireResult } from "@/lib/market-hire";
import { insertJob, openJobFor } from "@/lib/market-jobs";
import { currentMandate, currentSession, logMarket, withMarket } from "@/lib/market-session";
import { jobsFor, milestoneView, milestoneViews } from "@/lib/queries";
import { SITE_URL } from "@/lib/site";
import { listedPrice } from "./[id]/fix/market";
import { repoName } from "@/lib/format";
import { milestoneStatus } from "@/lib/status";

export interface MilestoneSummary {
  id: string;
  title: string;
  threadRepo: string;
  codeRepoUrl: string | null;
  pinnedSha: string | null;
  reviewer: string | null;
  askedAt: string | null;
  group: QueueGroup;
  tally: { missing: number; works: number; unsure: number } | null;
  /** Asks the latest finished fix run passed that failed on the reviewed commit. */
  fixed?: number;
  runStep: { current: number; total: number } | null;
  lastRunAt: string | null;
}

const ids = z.array(z.string().uuid()).max(50);

/** Summaries for the ids this browser remembers. Unknown ids are dropped, never an error. */
export async function milestoneSummaries(input: unknown): Promise<MilestoneSummary[]> {
  const parsed = ids.safeParse(input);
  if (!parsed.success) return [];
  const views = await milestoneViews(parsed.data);
  const jobs = await Promise.all(views.map((v) => jobsFor(v.milestone.id)));
  const latestJob = new Map(views.map((v, i) => [v.milestone.id, jobs[i]?.[0]?.status]));
  const order = new Map(parsed.data.map((id, i) => [id, i]));
  return views
    .sort((a, b) => (order.get(a.milestone.id) ?? 0) - (order.get(b.milestone.id) ?? 0))
    .map((view) => {
      const status = milestoneStatus(view);
      const run = view.base?.replay;
      const job = latestJob.get(view.milestone.id);
      const patch = latestPatch(view);
      return {
        id: view.milestone.id,
        title: view.milestone.threadTitle ?? `Milestone on ${repoName(view.milestone.codeRepoUrl)}`,
        threadRepo: view.milestone.threadRepo,
        codeRepoUrl: view.milestone.codeRepoUrl,
        pinnedSha: view.milestone.pinnedSha,
        reviewer: view.milestone.reviewerLogin,
        askedAt: view.milestone.reviewerCommentAt?.toISOString() ?? null,
        group: queueGroup(view, job && isJobStatus(job) ? job : null),
        fixed: patch?.replay.status === "finished" ? compareAsks(view, patch).filter((c) => c.change === "fixed").length : 0,
        tally: status.kind === "finished" ? status.tally : null,
        runStep: status.kind === "running" ? { current: status.current, total: status.total } : status.kind === "queued" ? { current: 0, total: status.total } : null,
        lastRunAt: (run?.finishedAt ?? run?.startedAt ?? run?.createdAt)?.toISOString() ?? null,
      };
    });
}

export type { HireResult };

const hireForm = z.object({ milestoneId: z.string().uuid(), agentId: z.string().min(1).max(100), agentName: z.string().max(200), priceCents: z.coerce.number().int().nonnegative().optional() });

/**
 * The hire button's action. It checks the owner's Agent Market session and spending limit, saves the brief as a
 * draft on Agent Market (MARKET_PREPARE_JOB) and answers its checkout page. The owner pays there; nothing here
 * moves money.
 */
export async function hireAgent(_prev: HireResult, form: FormData): Promise<HireResult> {
  const parsed = hireForm.safeParse({
    milestoneId: form.get("milestoneId"),
    agentId: form.get("agentId"),
    agentName: form.get("agentName"),
    priceCents: form.get("priceCents") || undefined,
  });
  if (!parsed.success) return { kind: "invalid", message: "Choose an agent with a listed price first." };
  try {
    return await hire(
      {
        now: () => new Date(),
        newId: randomUUID,
        siteUrl: SITE_URL,
        session: currentSession,
        view: milestoneView,
        openJob: openJobFor,
        listedPrice,
        mandate: currentMandate,
        market: withMarket,
        saveJob: insertJob,
        log: logMarket,
      },
      { ...parsed.data, priceCents: parsed.data.priceCents ?? null },
    );
  } catch (error) {
    logMarket("hire failed", error);
    return { kind: "refused", message: "Something went wrong before UNSTUCK reached Agent Market. Nothing was charged. Try again in a minute." };
  }
}
