import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { OutputCapture } from "./output";
import type { ReplayResult, ReplayRunner, ReplaySpec, StepNetwork, StepResult } from "./types";
import { assertReplayInput } from "./validate";

export interface DockerRunnerOptions {
  dockerBin?: string;
  gitImage?: string;
  cpus?: string;
  memory?: string;
  pidsLimit?: number;
  tailBytes?: number;
  checkoutTimeoutMs?: number;
}

const DOCKER_DAEMON_ERROR = 125;

interface Exec {
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  output: OutputCapture;
}

export class DockerRunner implements ReplayRunner {
  readonly #docker: string;
  readonly #gitImage: string;
  readonly #cpus: string;
  readonly #memory: string;
  readonly #pidsLimit: number;
  readonly #tailBytes: number;
  readonly #checkoutTimeoutMs: number;

  constructor(options: DockerRunnerOptions = {}) {
    this.#docker = options.dockerBin ?? "docker";
    this.#gitImage = options.gitImage ?? "alpine/git:v2.49.1";
    this.#cpus = options.cpus ?? "2";
    this.#memory = options.memory ?? "3g";
    this.#pidsLimit = options.pidsLimit ?? 512;
    this.#tailBytes = options.tailBytes ?? 64 * 1024;
    this.#checkoutTimeoutMs = options.checkoutTimeoutMs ?? 120_000;
  }

  async run(spec: ReplaySpec, onStep?: (result: StepResult) => Promise<void> | void): Promise<ReplayResult> {
    assertReplayInput(spec.repoUrl, spec.sha, spec.image);
    const id = randomUUID().slice(0, 12);
    const volume = `unstuck-replay-${id}`;

    await this.#docker_(["volume", "create", volume], 30_000);
    try {
      const checkout = await this.#checkout(id, volume, spec);
      if (checkout.exitCode !== 0) return { checkout, steps: [], stoppedEarly: true };

      const steps: StepResult[] = [];
      for (const [index, step] of spec.steps.entries()) {
        const exec = await this.#container(`unstuck-${id}-${index}`, step.network, step.timeoutMs, [
          ...this.#sandboxFlags(volume),
          spec.image,
          "sh",
          "-lc",
          step.command,
        ]);
        const result = toResult(index + 1, step.name, step.command, step.network, exec);
        steps.push(result);
        await onStep?.(result);
        if (step.stopOnFail && result.exitCode !== 0) return { checkout, steps, stoppedEarly: index < spec.steps.length - 1 };
      }
      return { checkout, steps, stoppedEarly: false };
    } finally {
      await this.#docker_(["volume", "rm", "-f", volume], 60_000);
    }
  }

  async #checkout(id: string, volume: string, spec: ReplaySpec): Promise<StepResult> {
    const script = [
      "set -e",
      "git init -q /work/repo",
      "cd /work/repo",
      'git remote add origin "$REPO_URL"',
      'git fetch -q --depth 1 origin "$SHA"',
      "git -c advice.detachedHead=false checkout -q FETCH_HEAD",
      'if [ -n "$APPLY_PATCH" ]; then git apply --whitespace=nowarn -; fi',
      "git rev-parse HEAD",
    ].join("\n");
    const exec = await this.#container(
      `unstuck-${id}-checkout`,
      "bridge",
      this.#checkoutTimeoutMs,
      [
        "-i",
        "--cap-drop",
        "ALL",
        "--cap-add",
        "CHOWN",
        "--cap-add",
        "DAC_OVERRIDE",
        "--cap-add",
        "FOWNER",
        "--security-opt",
        "no-new-privileges",
        "-v",
        `${volume}:/work`,
        "-e",
        `REPO_URL=${spec.repoUrl}`,
        "-e",
        `SHA=${spec.sha}`,
        "-e",
        `APPLY_PATCH=${spec.patch ? "1" : ""}`,
        "--entrypoint",
        "sh",
        this.#gitImage,
        "-c",
        script,
      ],
      spec.patch,
    );
    return toResult(0, "checkout", `checkout ${spec.repoUrl}@${spec.sha}${spec.patch ? " + patch" : ""}`, "bridge", exec);
  }

  #sandboxFlags(volume: string): string[] {
    return [
      "--read-only",
      "--tmpfs",
      "/tmp:rw,exec,size=1g",
      "-e",
      "HOME=/work/.home",
      "-e",
      "CI=true",
      "-v",
      `${volume}:/work`,
      "-w",
      "/work/repo",
      "--cpus",
      this.#cpus,
      "--memory",
      this.#memory,
      "--memory-swap",
      this.#memory,
      "--pids-limit",
      String(this.#pidsLimit),
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
    ];
  }

  async #container(name: string, network: StepNetwork, timeoutMs: number, args: string[], stdin?: string): Promise<Exec> {
    const exec = await this.#spawn(["run", "--rm", "--name", name, "--network", network, ...args], timeoutMs, stdin, name);
    if (exec.exitCode === DOCKER_DAEMON_ERROR) {
      throw new Error(`docker could not start ${name}, so no verdict was recorded: ${exec.output.finish().tail}`);
    }
    return exec;
  }

  async #docker_(args: string[], timeoutMs: number): Promise<void> {
    const exec = await this.#spawn(args, timeoutMs);
    if (exec.exitCode !== 0) throw new Error(`docker ${args.join(" ")} failed: ${exec.output.finish().tail}`);
  }

  #spawn(args: string[], timeoutMs: number, stdin?: string, containerName?: string): Promise<Exec> {
    const started = Date.now();
    const output = new OutputCapture(this.#tailBytes);
    return new Promise((resolve, reject) => {
      const child = spawn(this.#docker, args, { stdio: ["pipe", "pipe", "pipe"] });
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        if (containerName) spawn(this.#docker, ["kill", containerName], { stdio: "ignore" });
        else child.kill("SIGKILL");
      }, timeoutMs);

      child.stdout.on("data", (chunk: Buffer) => output.write(chunk));
      child.stderr.on("data", (chunk: Buffer) => output.write(chunk));
      child.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({ exitCode: timedOut ? null : code, timedOut, durationMs: Date.now() - started, output });
      });
      child.stdin.end(stdin ?? "");
    });
  }
}

function toResult(step: number, name: string, command: string, network: StepNetwork, exec: Exec): StepResult {
  const { tail, sha256 } = exec.output.finish();
  return {
    step,
    name,
    command,
    network,
    exitCode: exec.exitCode,
    timedOut: exec.timedOut,
    durationMs: exec.durationMs,
    outputTail: tail,
    outputSha256: sha256,
    outputBytes: exec.output.bytes,
  };
}
