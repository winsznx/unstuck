import type { AskVerdict } from "./events";

export interface PlannedStep {
  step: number;
  askId?: string | undefined;
}

export interface StepOutcome {
  step: number;
  exitCode: number | null;
  timedOut: boolean;
}

export function verdictFor(askId: string, planned: readonly PlannedStep[], outcomes: readonly StepOutcome[]): AskVerdict {
  const steps = planned.filter((p) => p.askId === askId);
  if (steps.length === 0) return "unsure";
  const byStep = new Map(outcomes.map((o) => [o.step, o]));
  const results = steps.map((s) => byStep.get(s.step));
  if (results.some((r) => r !== undefined && (r.timedOut || r.exitCode !== 0))) return "missing";
  if (results.some((r) => r === undefined)) return "unsure";
  return "done";
}

export function firstFailure(outcomes: readonly StepOutcome[]): StepOutcome | undefined {
  return [...outcomes].sort((a, b) => a.step - b.step).find((o) => o.timedOut || o.exitCode !== 0);
}
