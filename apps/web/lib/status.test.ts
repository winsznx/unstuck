import { describe, expect, it } from "vitest";
import type { CommandResult, MilestoneView } from "./queries";
import { milestoneStatus, stepRows, tallyAsks, wholeDaysBetween } from "./status";

const step = (name: string) => ({ name, command: "true", network: "none" as const, timeoutMs: 1000, stopOnFail: false });
const result = (n: number, exitCode: number | null, timedOut = 0) => ({ step: n, exitCode, timedOut }) as CommandResult;

describe("stepRows", () => {
  it("marks the first step without a result as running while the replay runs", () => {
    const rows = stepRows({ status: "running", steps: [step("a"), step("b"), step("c")] }, [result(0, 0), result(1, 0)]);
    expect(rows.map((r) => r.state)).toEqual(["passed", "running", "waiting"]);
  });

  it("separates failures, timeouts and steps that never ran", () => {
    const rows = stepRows({ status: "finished", steps: [step("a"), step("b"), step("c")] }, [result(1, 2), result(2, null, 1)]);
    expect(rows.map((r) => r.state)).toEqual(["failed", "timed-out", "skipped"]);
  });
});

describe("milestoneStatus", () => {
  const base = (status: "queued" | "running" | "finished" | "error", error: string | null = null) =>
    ({ replay: { status, error, steps: [step("a"), step("b")], startedAt: null, finishedAt: null }, results: [result(1, 1), result(2, 0)] }) as unknown as MilestoneView["base"];

  it("never judges a run that couldn't start", () => {
    expect(milestoneStatus({ asks: [], base: base("error", "checkout failed: x") })).toEqual({ kind: "error", reason: "checkout failed: x", checkoutFailed: true });
  });

  it("counts steps when no sentence was picked", () => {
    const status = milestoneStatus({ asks: [], base: base("finished") });
    expect(status).toMatchObject({ kind: "finished", counting: "checks", tally: { missing: 1, works: 1, unsure: 0 } });
  });

  it("reports no checks when nothing will run", () => {
    expect(milestoneStatus({ asks: [], base: null })).toEqual({ kind: "no-checks" });
  });
});

describe("tallyAsks", () => {
  it("counts an ask still waiting on the run as not sure", () => {
    expect(tallyAsks([{ verdict: "missing" }, { verdict: "done" }, { verdict: "open" }])).toEqual({ missing: 1, works: 1, unsure: 1 });
  });
});

describe("wholeDaysBetween", () => {
  it("floors and never goes negative", () => {
    expect(wholeDaysBetween(new Date("2026-10-21T10:00Z"), new Date("2026-11-06T09:00Z"))).toBe(15);
    expect(wholeDaysBetween(new Date("2026-11-07"), new Date("2026-11-06"))).toBe(0);
  });
});
