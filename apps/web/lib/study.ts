import { verdictFor } from "@unstuck/core";
import type { ReplayStepSpec } from "@unstuck/db";
import { programOf } from "./programs";

export interface StudyMilestone {
  id: string;
  threadUrl: string;
  threadRepo: string;
  threadTitle: string | null;
  codeRepoUrl: string | null;
  pinnedSha: string | null;
  reviewerCommentId: string | null;
  reviewerCommentUrl: string | null;
  reviewerLogin: string | null;
  reviewerCommentAt: Date | null;
  createdAt: Date;
}

export interface StudyAsk {
  id: string;
  milestoneId: string;
}

export interface StudyReplay {
  id: string;
  milestoneId: string;
  target: "base" | "patch";
  status: "queued" | "running" | "finished" | "error";
  sha: string;
  steps: Pick<ReplayStepSpec, "askId">[];
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
}

export interface StudyResult {
  replayId: string;
  step: number;
  exitCode: number | null;
  timedOut: number;
  durationMs: number;
}

export interface StudyInput {
  milestones: readonly StudyMilestone[];
  asks: readonly StudyAsk[];
  replays: readonly StudyReplay[];
  results: readonly StudyResult[];
}

export interface VerdictTally {
  missing: number;
  works: number;
  unsure: number;
}

export interface ReviewRow {
  key: string;
  program: string;
  threadUrl: string;
  threadTitle: string | null;
  commentUrl: string | null;
  reviewer: string | null;
  reviewedAt: Date | null;
  codeRepoUrl: string | null;
  sha: string | null;
  /** Milestones opened on this one comment. Repeat runs of the same review are counted once everywhere else. */
  attempts: number;
  /** The milestone whose latest finished rerun decides this review's verdicts. */
  milestoneId: string;
  replayId: string | null;
  asks: number;
  verdicts: VerdictTally;
  firstRerunAt: Date | null;
  /** Whole days from the reviewer's comment to the first finished rerun. */
  daysToRerun: number | null;
}

export interface StepTotals {
  ran: number;
  passed: number;
  failed: number;
  timedOut: number;
}

export interface ProgramRow {
  program: string;
  reviews: number;
  asks: number;
  missing: number;
}

export interface Study {
  reviews: ReviewRow[];
  milestones: number;
  asks: number;
  verdicts: VerdictTally;
  replays: { total: number; finished: number; error: number; live: number; patch: number };
  steps: StepTotals;
  programs: ProgramRow[];
  medianDaysToRerun: number | null;
  medianStepMs: number | null;
}

const DAY_MS = 86_400_000;

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[mid] ?? null) : Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}

/** One reviewer comment, however many times it was opened. */
export const reviewKey = (m: Pick<StudyMilestone, "reviewerCommentUrl" | "threadUrl" | "reviewerCommentId" | "id">): string =>
  m.reviewerCommentId ? `${m.threadUrl}#${m.reviewerCommentId}` : (m.reviewerCommentUrl ?? `milestone:${m.id}`);

const finishedTime = (r: StudyReplay) => (r.finishedAt ?? r.createdAt).getTime();

function stepOutcomes(results: readonly StudyResult[]) {
  return results.filter((r) => r.step > 0).map((r) => ({ step: r.step, exitCode: r.exitCode, timedOut: r.timedOut === 1 }));
}

function tallyFor(askIds: readonly string[], replay: StudyReplay | undefined, results: readonly StudyResult[]): VerdictTally {
  const tally: VerdictTally = { missing: 0, works: 0, unsure: 0 };
  if (!replay) {
    tally.unsure = askIds.length;
    return tally;
  }
  const planned = replay.steps.map((s, i) => ({ step: i + 1, askId: s.askId }));
  const outcomes = stepOutcomes(results);
  for (const id of askIds) {
    const verdict = verdictFor(id, planned, outcomes);
    if (verdict === "missing") tally.missing += 1;
    else if (verdict === "done") tally.works += 1;
    else tally.unsure += 1;
  }
  return tally;
}

export function buildStudy(input: StudyInput): Study {
  const resultsByReplay = groupBy(input.results, (r) => r.replayId);
  const asksByMilestone = groupBy(input.asks, (a) => a.milestoneId);
  const replaysByMilestone = groupBy(input.replays, (r) => r.milestoneId);
  const latestBase = (milestoneId: string) =>
    (replaysByMilestone.get(milestoneId) ?? [])
      .filter((r) => r.target === "base" && r.status === "finished")
      .sort((a, b) => finishedTime(b) - finishedTime(a))[0];

  const groups = groupBy(input.milestones, reviewKey);
  const reviews: ReviewRow[] = [...groups.entries()].map(([key, members]) => {
    const { m: rep, replay } = first(
      members
        .map((m) => ({ m, replay: latestBase(m.id) }))
        .sort((a, b) => (b.replay ? finishedTime(b.replay) : -1) - (a.replay ? finishedTime(a.replay) : -1) || b.m.createdAt.getTime() - a.m.createdAt.getTime()),
    );
    const askIds = (asksByMilestone.get(rep.id) ?? []).map((a) => a.id);
    const reruns = members
      .flatMap((m) => replaysByMilestone.get(m.id) ?? [])
      .filter((r) => r.target === "base" && r.status === "finished" && r.finishedAt)
      .map((r) => (r.finishedAt as Date).getTime());
    const firstRerunAt = reruns.length > 0 ? new Date(Math.min(...reruns)) : null;
    const reviewedAt = members.find((m) => m.reviewerCommentAt)?.reviewerCommentAt ?? null;
    return {
      key,
      program: programOf(rep.threadRepo),
      threadUrl: rep.threadUrl,
      threadTitle: members.find((m) => m.threadTitle)?.threadTitle ?? null,
      commentUrl: members.find((m) => m.reviewerCommentUrl)?.reviewerCommentUrl ?? null,
      reviewer: rep.reviewerLogin,
      reviewedAt,
      codeRepoUrl: rep.codeRepoUrl,
      sha: replay?.sha ?? rep.pinnedSha,
      attempts: members.length,
      milestoneId: rep.id,
      replayId: replay?.id ?? null,
      asks: askIds.length,
      verdicts: tallyFor(askIds, replay, replay ? (resultsByReplay.get(replay.id) ?? []) : []),
      firstRerunAt,
      daysToRerun: reviewedAt && firstRerunAt ? Math.max(0, Math.floor((firstRerunAt.getTime() - reviewedAt.getTime()) / DAY_MS)) : null,
    };
  });
  reviews.sort((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0));

  const finished = input.replays.filter((r) => r.status === "finished");
  const finishedIds = new Set(finished.map((r) => r.id));
  const executed = input.results.filter((r) => r.step > 0 && finishedIds.has(r.replayId));
  const steps: StepTotals = {
    ran: executed.length,
    passed: executed.filter((r) => r.timedOut !== 1 && r.exitCode === 0).length,
    failed: executed.filter((r) => r.timedOut !== 1 && r.exitCode !== 0).length,
    timedOut: executed.filter((r) => r.timedOut === 1).length,
  };

  const programs = [...groupBy(reviews, (r) => r.program).entries()]
    .map(([program, rows]) => ({
      program,
      reviews: rows.length,
      asks: sum(rows.map((r) => r.asks)),
      missing: sum(rows.map((r) => r.verdicts.missing)),
    }))
    .sort((a, b) => b.reviews - a.reviews || a.program.localeCompare(b.program));

  return {
    reviews,
    milestones: input.milestones.length,
    asks: sum(reviews.map((r) => r.asks)),
    verdicts: {
      missing: sum(reviews.map((r) => r.verdicts.missing)),
      works: sum(reviews.map((r) => r.verdicts.works)),
      unsure: sum(reviews.map((r) => r.verdicts.unsure)),
    },
    replays: {
      total: input.replays.length,
      finished: finished.length,
      error: input.replays.filter((r) => r.status === "error").length,
      live: input.replays.filter((r) => r.status === "queued" || r.status === "running").length,
      patch: input.replays.filter((r) => r.target === "patch").length,
    },
    steps,
    programs,
    medianDaysToRerun: median(reviews.flatMap((r) => (r.daysToRerun === null ? [] : [r.daysToRerun]))),
    medianStepMs: median(executed.map((r) => r.durationMs)),
  };
}

export interface RunRow {
  id: string;
  milestoneId: string;
  target: "base" | "patch";
  status: StudyReplay["status"];
  program: string;
  threadTitle: string | null;
  codeRepoUrl: string | null;
  sha: string;
  checks: number;
  passed: number;
  failed: number;
  notRun: number;
  at: Date;
  tookMs: number | null;
}

/** Every recorded run, newest first. Checkout (step 0) is not a check, so it isn't counted. */
export function runIndex(input: Pick<StudyInput, "milestones" | "replays" | "results">): RunRow[] {
  const milestonesById = new Map(input.milestones.map((m) => [m.id, m]));
  const resultsByReplay = groupBy(input.results, (r) => r.replayId);
  return input.replays
    .flatMap((replay): RunRow[] => {
      const milestone = milestonesById.get(replay.milestoneId);
      if (!milestone) return [];
      const checks = (resultsByReplay.get(replay.id) ?? []).filter((r) => r.step > 0);
      const passed = checks.filter((r) => r.timedOut !== 1 && r.exitCode === 0).length;
      const failed = checks.length - passed;
      return [
        {
          id: replay.id,
          milestoneId: replay.milestoneId,
          target: replay.target,
          status: replay.status,
          program: programOf(milestone.threadRepo),
          threadTitle: milestone.threadTitle,
          codeRepoUrl: milestone.codeRepoUrl,
          sha: replay.sha,
          checks: replay.steps.length,
          passed,
          failed,
          notRun: Math.max(0, replay.steps.length - checks.length),
          at: replay.startedAt ?? replay.createdAt,
          tookMs: replay.startedAt && replay.finishedAt ? replay.finishedAt.getTime() - replay.startedAt.getTime() : null,
        },
      ];
    })
    .sort((a, b) => b.at.getTime() - a.at.getTime());
}

function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function first<T>(items: readonly T[]): T {
  const [head] = items;
  if (head === undefined) throw new Error("expected a non-empty group");
  return head;
}

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
