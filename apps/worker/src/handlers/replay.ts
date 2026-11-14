import { eq } from "drizzle-orm";
import { z } from "zod";
import { commandResults, milestones, replays, type Db } from "@unstuck/db";
import type { ReplayRunner, StepResult } from "@unstuck/replay";

export const replayPayload = z.object({ replayId: z.string().uuid() });

export async function runReplay(db: Db, runner: ReplayRunner, raw: unknown): Promise<void> {
  const { replayId } = replayPayload.parse(raw);
  const replay = await db.query.replays.findFirst({ where: eq(replays.id, replayId) });
  if (!replay) throw new Error(`replay ${replayId} not found`);
  if (replay.status === "finished") return;

  const milestone = await db.query.milestones.findFirst({ where: eq(milestones.id, replay.milestoneId) });
  if (!milestone?.codeRepoUrl) throw new Error(`milestone ${replay.milestoneId} has no code repo`);

  await db.delete(commandResults).where(eq(commandResults.replayId, replayId));
  await db.update(replays).set({ status: "running", startedAt: new Date(), error: null }).where(eq(replays.id, replayId));

  const record = (r: StepResult) =>
    db.insert(commandResults).values({
      replayId,
      step: r.step,
      name: r.name,
      command: r.command,
      network: r.network,
      exitCode: r.exitCode,
      timedOut: r.timedOut ? 1 : 0,
      durationMs: r.durationMs,
      outputTail: r.outputTail,
      outputSha256: r.outputSha256,
      outputBytes: r.outputBytes,
    });

  try {
    const result = await runner.run(
      { repoUrl: milestone.codeRepoUrl, sha: replay.sha, image: replay.image, steps: replay.steps, ...(replay.patch ? { patch: replay.patch } : {}) },
      async (step) => {
        await record(step);
      },
    );
    await record(result.checkout);
    if (result.checkout.exitCode !== 0) {
      await db
        .update(replays)
        .set({ status: "error", error: `checkout failed: ${result.checkout.outputTail.slice(-500)}`, finishedAt: new Date() })
        .where(eq(replays.id, replayId));
      return;
    }
    await db.update(replays).set({ status: "finished", finishedAt: new Date() }).where(eq(replays.id, replayId));
  } catch (error) {
    await db.update(replays).set({ status: "error", error: String(error), finishedAt: new Date() }).where(eq(replays.id, replayId));
    throw error;
  }
}
