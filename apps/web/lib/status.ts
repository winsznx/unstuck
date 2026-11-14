import type { AskView, CommandResult, MilestoneView, Replay } from "./queries";

export type StepState = "passed" | "failed" | "timed-out" | "running" | "waiting" | "skipped";

export interface StepRow {
  n: number;
  name: string;
  command: string;
  network: "none" | "bridge";
  askId: string | null;
  result: CommandResult | null;
  state: StepState;
}

export function stepRows(replay: Pick<Replay, "status" | "steps">, results: readonly CommandResult[]): StepRow[] {
  const byStep = new Map(results.map((r) => [r.step, r]));
  const live = replay.status === "queued" || replay.status === "running";
  const ran = results.filter((r) => r.step > 0).length;
  return replay.steps.map((step, i) => {
    const n = i + 1;
    const result = byStep.get(n) ?? null;
    let state: StepState;
    if (result) state = result.timedOut === 1 ? "timed-out" : result.exitCode === 0 ? "passed" : "failed";
    else if (replay.status === "running" && n === ran + 1) state = "running";
    else state = live ? "waiting" : "skipped";
    return { n, name: step.name, command: step.command, network: step.network, askId: step.askId ?? null, result, state };
  });
}

export interface Tally {
  missing: number;
  works: number;
  unsure: number;
}

export type MilestoneStatus =
  | { kind: "no-checks" }
  | { kind: "queued"; total: number }
  | { kind: "running"; current: number; total: number; startedAt: Date | null }
  | { kind: "error"; reason: string; checkoutFailed: boolean }
  | { kind: "finished"; tally: Tally; counting: "asks" | "checks"; finishedAt: Date | null };

export function tallyAsks(asks: readonly Pick<AskView, "verdict">[]): Tally {
  return {
    missing: asks.filter((a) => a.verdict === "missing").length,
    works: asks.filter((a) => a.verdict === "done").length,
    unsure: asks.filter((a) => a.verdict === "unsure" || a.verdict === "open").length,
  };
}

export function tallySteps(rows: readonly StepRow[]): Tally {
  return {
    missing: rows.filter((r) => r.state === "failed" || r.state === "timed-out").length,
    works: rows.filter((r) => r.state === "passed").length,
    unsure: rows.filter((r) => r.state === "skipped").length,
  };
}

export function milestoneStatus(view: Pick<MilestoneView, "asks" | "base">): MilestoneStatus {
  const { base, asks } = view;
  if (!base || base.replay.steps.length === 0) return { kind: "no-checks" };
  const { replay, results } = base;
  const total = replay.steps.length;
  switch (replay.status) {
    case "queued":
      return { kind: "queued", total };
    case "running":
      return { kind: "running", current: Math.min(results.filter((r) => r.step > 0).length + 1, total), total, startedAt: replay.startedAt };
    case "error":
      return { kind: "error", reason: replay.error ?? "The runner stopped without a reason.", checkoutFailed: (replay.error ?? "").startsWith("checkout failed") };
    case "finished":
      return asks.length > 0
        ? { kind: "finished", tally: tallyAsks(asks), counting: "asks", finishedAt: replay.finishedAt }
        : { kind: "finished", tally: tallySteps(stepRows(replay, results)), counting: "checks", finishedAt: replay.finishedAt };
  }
}

export function wholeDaysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}
