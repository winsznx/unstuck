import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { cache } from "react";
import type { AskVerdict } from "@unstuck/core";
import { asks, commandResults, jobs, milestones, replays } from "@unstuck/db";
import { db } from "./db";
import { judge } from "./fix";

export type Milestone = typeof milestones.$inferSelect;
export type Ask = typeof asks.$inferSelect;
export type Replay = typeof replays.$inferSelect;
export type CommandResult = typeof commandResults.$inferSelect;

export interface AskView extends Ask {
  verdict: AskVerdict | "open";
  failure: { step: number; name: string; line: string | null; exitCode: number | null; timedOut: boolean } | null;
}

export interface ReplayView {
  replay: Replay;
  results: CommandResult[];
}

export interface MilestoneView {
  milestone: Milestone;
  asks: AskView[];
  base: ReplayView | null;
  patches: ReplayView[];
}

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

async function resultsOf(replayId: string): Promise<CommandResult[]> {
  return db().select().from(commandResults).where(eq(commandResults.replayId, replayId)).orderBy(asc(commandResults.step));
}

export async function replayView(replayId: string): Promise<(ReplayView & { milestone: Milestone; asks: Ask[] }) | null> {
  if (!isUuid(replayId)) return null;
  const replay = await db().query.replays.findFirst({ where: eq(replays.id, replayId) });
  if (!replay) return null;
  const milestone = await db().query.milestones.findFirst({ where: eq(milestones.id, replay.milestoneId) });
  if (!milestone) return null;
  const askRows = await db().select().from(asks).where(eq(asks.milestoneId, milestone.id)).orderBy(asc(asks.quoteStart));
  return { replay, results: await resultsOf(replay.id), milestone, asks: askRows };
}

async function loadMilestoneView(milestoneId: string): Promise<MilestoneView | null> {
  if (!isUuid(milestoneId)) return null;
  const milestone = await db().query.milestones.findFirst({ where: eq(milestones.id, milestoneId) });
  if (!milestone) return null;

  const [askRows, replayRows] = await Promise.all([
    db().select().from(asks).where(eq(asks.milestoneId, milestoneId)).orderBy(asc(asks.quoteStart), asc(asks.createdAt)),
    db().select().from(replays).where(eq(replays.milestoneId, milestoneId)).orderBy(desc(replays.createdAt)),
  ]);

  const baseReplay = replayRows.find((r) => r.target === "base");
  const base = baseReplay ? { replay: baseReplay, results: await resultsOf(baseReplay.id) } : null;
  const patches = await Promise.all(
    replayRows.filter((r) => r.target === "patch").map(async (replay) => ({ replay, results: await resultsOf(replay.id) })),
  );

  const verdicts = judge(askRows, base);
  const askViews = askRows.map((ask): AskView => ({ ...ask, ...(verdicts.get(ask.id) ?? { verdict: "open", failure: null }) }));

  return { milestone, asks: askViews, base, patches };
}

export async function showcase(): Promise<MilestoneView[]> {
  const ids = (process.env.UNSTUCK_SHOWCASE ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const views = await Promise.all(ids.map((id) => milestoneView(id).catch(() => null)));
  return views.filter((v): v is MilestoneView => v !== null);
}

export async function latestFinishedReplay(milestoneId: string, target: "base" | "patch"): Promise<Replay | undefined> {
  return db().query.replays.findFirst({
    where: and(eq(replays.milestoneId, milestoneId), eq(replays.target, target), eq(replays.status, "finished")),
    orderBy: desc(replays.finishedAt),
  });
}

/** One read per request, shared by the milestone layout and its pages. */
export const milestoneView = cache(loadMilestoneView);

export type Job = typeof jobs.$inferSelect;

export async function jobsFor(milestoneId: string): Promise<Job[]> {
  if (!isUuid(milestoneId)) return [];
  return db().select().from(jobs).where(eq(jobs.milestoneId, milestoneId)).orderBy(desc(jobs.createdAt));
}

/** Only the milestones this browser asked for, by id. There is no list of everyone's milestones. */
export async function milestoneViews(ids: readonly string[]): Promise<MilestoneView[]> {
  const wanted = [...new Set(ids.filter(isUuid))].slice(0, 50);
  if (wanted.length === 0) return [];
  const found = await db().select({ id: milestones.id }).from(milestones).where(inArray(milestones.id, wanted));
  const views = await Promise.all(found.map((row) => loadMilestoneView(row.id)));
  return views.filter((v): v is MilestoneView => v !== null);
}
