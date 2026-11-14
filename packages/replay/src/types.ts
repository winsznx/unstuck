export type StepNetwork = "none" | "bridge";

export interface ReplayStep {
  name: string;
  command: string;
  network: StepNetwork;
  timeoutMs: number;
  stopOnFail: boolean;
}

export interface ReplaySpec {
  repoUrl: string;
  sha: string;
  image: string;
  steps: readonly ReplayStep[];
  patch?: string;
}

export interface StepResult {
  step: number;
  name: string;
  command: string;
  network: StepNetwork;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  outputTail: string;
  outputSha256: string;
  outputBytes: number;
}

export interface ReplayResult {
  checkout: StepResult;
  steps: StepResult[];
  stoppedEarly: boolean;
}

export interface ReplayRunner {
  run(spec: ReplaySpec, onStep?: (result: StepResult) => Promise<void> | void): Promise<ReplayResult>;
}
