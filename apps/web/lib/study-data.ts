import "server-only";
import { asks, commandResults, milestones, replays } from "@unstuck/db";
import { db } from "./db";
import type { StudyInput } from "./study";

/** Everything the study and the run index count. Small tables, read whole: the math lives in study.ts. */
export async function loadStudyInput(): Promise<StudyInput> {
  const [milestoneRows, askRows, replayRows, resultRows] = await Promise.all([
    db()
      .select({
        id: milestones.id,
        threadUrl: milestones.threadUrl,
        threadRepo: milestones.threadRepo,
        threadTitle: milestones.threadTitle,
        codeRepoUrl: milestones.codeRepoUrl,
        pinnedSha: milestones.pinnedSha,
        reviewerCommentId: milestones.reviewerCommentId,
        reviewerCommentUrl: milestones.reviewerCommentUrl,
        reviewerLogin: milestones.reviewerLogin,
        reviewerCommentAt: milestones.reviewerCommentAt,
        createdAt: milestones.createdAt,
      })
      .from(milestones),
    db().select({ id: asks.id, milestoneId: asks.milestoneId }).from(asks),
    db()
      .select({
        id: replays.id,
        milestoneId: replays.milestoneId,
        target: replays.target,
        status: replays.status,
        sha: replays.sha,
        steps: replays.steps,
        startedAt: replays.startedAt,
        finishedAt: replays.finishedAt,
        createdAt: replays.createdAt,
      })
      .from(replays),
    db()
      .select({
        replayId: commandResults.replayId,
        step: commandResults.step,
        exitCode: commandResults.exitCode,
        timedOut: commandResults.timedOut,
        durationMs: commandResults.durationMs,
      })
      .from(commandResults),
  ]);
  return { milestones: milestoneRows, asks: askRows, replays: replayRows, results: resultRows };
}
