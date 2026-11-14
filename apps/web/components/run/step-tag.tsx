import type { StepRow, StepState } from "@/lib/status";
import { PunchTag, type TagVerdict } from "../tag";

const VERDICT: Record<StepState, TagVerdict> = {
  passed: "works",
  failed: "missing",
  "timed-out": "missing",
  running: "open",
  waiting: "open",
  skipped: "unsure",
};

export function stepLabel(row: Pick<StepRow, "state" | "result">): string {
  switch (row.state) {
    case "passed":
    case "failed":
      return `Exit ${row.result?.exitCode ?? "unknown"}`;
    case "timed-out":
      return "Ran out of time";
    case "running":
      return "Running";
    case "waiting":
      return "Waiting";
    case "skipped":
      return "Didn't run";
  }
}

export function StepTag({ row }: { row: Pick<StepRow, "state" | "result"> }) {
  return <PunchTag verdict={VERDICT[row.state]}>{stepLabel(row)}</PunchTag>;
}

export const stepVerdict = (state: StepState): TagVerdict => VERDICT[state];
