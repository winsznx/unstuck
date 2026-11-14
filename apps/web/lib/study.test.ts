import { describe, expect, it } from "vitest";
import { buildStudy, median, reviewKey, runIndex, type StudyInput, type StudyMilestone, type StudyReplay, type StudyResult } from "./study";

const at = (iso: string) => new Date(iso);

function milestone(id: string, over: Partial<StudyMilestone> = {}): StudyMilestone {
  return {
    id,
    threadUrl: "https://github.com/canton-foundation/canton-dev-fund/issues/887",
    threadRepo: "canton-foundation/canton-dev-fund",
    threadTitle: null,
    codeRepoUrl: "https://github.com/a/b",
    pinnedSha: "5e17c99aaaa",
    reviewerCommentId: "IC_1",
    reviewerCommentUrl: "https://github.com/canton-foundation/canton-dev-fund/issues/887#issuecomment-1",
    reviewerLogin: "rev",
    reviewerCommentAt: at("2026-10-21T10:00:00Z"),
    createdAt: at("2026-11-06T10:00:00Z"),
    ...over,
  };
}

function replay(id: string, milestoneId: string, askIds: (string | undefined)[], over: Partial<StudyReplay> = {}): StudyReplay {
  return {
    id,
    milestoneId,
    target: "base",
    status: "finished",
    sha: "5e17c99aaaa",
    steps: askIds.map((askId) => ({ askId })),
    startedAt: at("2026-11-06T12:00:00Z"),
    finishedAt: at("2026-11-06T12:00:05Z"),
    createdAt: at("2026-11-06T11:59:00Z"),
    ...over,
  };
}

const result = (replayId: string, step: number, exitCode: number | null, durationMs = 100, timedOut = 0): StudyResult => ({ replayId, step, exitCode, timedOut, durationMs });

describe("median", () => {
  it("handles empty, odd and even lists", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 10])).toBe(3);
  });
});

describe("reviewKey", () => {
  it("prefers thread + comment id, then the comment url, then the milestone", () => {
    expect(reviewKey(milestone("m1", { reviewerCommentUrl: null }))).toBe("https://github.com/canton-foundation/canton-dev-fund/issues/887#IC_1");
    expect(reviewKey(milestone("m1", { reviewerCommentId: null }))).toContain("#issuecomment-1");
    expect(reviewKey(milestone("m1", { reviewerCommentUrl: null, reviewerCommentId: null }))).toBe("milestone:m1");
  });
});

describe("buildStudy", () => {
  it("counts a review opened twice once, decided by its latest finished rerun", () => {
    const input: StudyInput = {
      milestones: [milestone("m1"), milestone("m2", { createdAt: at("2026-11-07T10:00:00Z") })],
      asks: [
        { id: "a1", milestoneId: "m1" },
        { id: "a2", milestoneId: "m2" },
      ],
      replays: [
        replay("r1", "m1", ["a1"], { finishedAt: at("2026-11-06T12:00:05Z") }),
        replay("r2", "m2", ["a2"], { finishedAt: at("2026-11-08T12:00:05Z") }),
      ],
      results: [result("r1", 0, 0, 3000), result("r1", 1, 1, 200), result("r2", 0, 0, 3000), result("r2", 1, 0, 400)],
    };
    const study = buildStudy(input);
    expect(study.reviews).toHaveLength(1);
    const [review] = study.reviews;
    expect(review?.attempts).toBe(2);
    expect(review?.replayId).toBe("r2");
    expect(review?.verdicts).toEqual({ missing: 0, works: 1, unsure: 0 });
    expect(review?.daysToRerun).toBe(16);
    expect(study.milestones).toBe(2);
    expect(study.asks).toBe(1);
    expect(study.steps).toEqual({ ran: 2, passed: 1, failed: 1, timedOut: 0 });
    expect(study.medianStepMs).toBe(300);
    expect(study.medianDaysToRerun).toBe(16);
  });

  it("marks asks unsure without a finished rerun and keeps error and live runs out of step totals", () => {
    const study = buildStudy({
      milestones: [milestone("m1", { reviewerCommentAt: null })],
      asks: [
        { id: "a1", milestoneId: "m1" },
        { id: "a2", milestoneId: "m1" },
      ],
      replays: [replay("r1", "m1", ["a1", "a2"], { status: "error" }), replay("r2", "m1", ["a1"], { status: "running", finishedAt: null })],
      results: [result("r1", 0, 128), result("r2", 1, 0)],
    });
    expect(study.reviews[0]?.verdicts).toEqual({ missing: 0, works: 0, unsure: 2 });
    expect(study.reviews[0]?.daysToRerun).toBeNull();
    expect(study.replays).toEqual({ total: 2, finished: 0, error: 1, live: 1, patch: 0 });
    expect(study.steps.ran).toBe(0);
    expect(study.medianDaysToRerun).toBeNull();
  });

  it("splits timeouts from failures and groups by program", () => {
    const study = buildStudy({
      milestones: [milestone("m1"), milestone("m2", { reviewerCommentId: "IC_2", threadRepo: "w3f/grant-milestone-delivery" })],
      asks: [
        { id: "a1", milestoneId: "m1" },
        { id: "a2", milestoneId: "m2" },
      ],
      replays: [replay("r1", "m1", ["a1"]), replay("r2", "m2", ["a2"])],
      results: [result("r1", 1, null, 60_000, 1), result("r2", 1, 1)],
    });
    expect(study.steps).toEqual({ ran: 2, passed: 0, failed: 1, timedOut: 1 });
    expect(study.verdicts.missing).toBe(2);
    expect(study.programs.map((p) => p.program).sort()).toEqual(["Canton Dev Fund", "Web3 Foundation Grants"]);
  });
});

describe("runIndex", () => {
  it("counts checks without the checkout and lists newest first", () => {
    const rows = runIndex({
      milestones: [milestone("m1")],
      replays: [
        replay("old", "m1", ["a1", "a1"], { startedAt: at("2026-11-01T00:00:00Z") }),
        replay("new", "m1", ["a1", "a1", undefined], { status: "error", startedAt: at("2026-11-05T00:00:00Z"), finishedAt: null }),
        replay("orphan", "gone", ["a1"]),
      ],
      results: [result("old", 0, 0), result("old", 1, 0), result("old", 2, 2), result("new", 0, 128)],
    });
    expect(rows.map((r) => r.id)).toEqual(["new", "old"]);
    expect(rows[1]).toMatchObject({ checks: 2, passed: 1, failed: 1, notRun: 0 });
    expect(rows[0]).toMatchObject({ checks: 3, passed: 0, failed: 0, notRun: 3, tookMs: null });
  });
});
