import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { DockerRunner } from "./docker";
import type { ReplayStep } from "./types";

const dockerAvailable = (() => {
  try {
    execFileSync("docker", ["info"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

const repoUrl = "https://github.com/octocat/Hello-World";
const sha = "7fd1a60b01f91b314f59955a4e4d4e80d8edf11d";
const step = (name: string, command: string, extra: Partial<ReplayStep> = {}): ReplayStep => ({
  name,
  command,
  network: "none",
  timeoutMs: 30_000,
  stopOnFail: false,
  ...extra,
});

describe.skipIf(!dockerAvailable)("DockerRunner (needs docker)", () => {
  const runner = new DockerRunner();

  it("checks out the pinned sha and records exit codes and output", async () => {
    const result = await runner.run({
      repoUrl,
      sha,
      image: "alpine:3.20",
      steps: [step("readme exists", "test -f README && head -c 20 README"), step("missing file", "cat docs/SETUP.md")],
    });
    expect(result.checkout.exitCode).toBe(0);
    expect(result.checkout.outputTail).toContain(sha);
    expect(result.steps.map((s) => s.exitCode)).toEqual([0, 1]);
    expect(result.steps[0]?.outputTail).toContain("Hello World");
    expect(result.steps[1]?.outputTail).toContain("No such file");
    expect(result.steps[1]?.outputSha256).toMatch(/^[0-9a-f]{64}$/);
  }, 120_000);

  it("blocks network on steps marked none", async () => {
    const result = await runner.run({
      repoUrl,
      sha,
      image: "alpine:3.20",
      steps: [step("network", "wget -q -T 3 -O- https://example.com")],
    });
    expect(result.steps[0]?.exitCode).not.toBe(0);
  }, 120_000);

  it("kills a step that runs past its time limit", async () => {
    const result = await runner.run({
      repoUrl,
      sha,
      image: "alpine:3.20",
      steps: [step("hang", "sleep 30", { timeoutMs: 1_500 })],
    });
    expect(result.steps[0]?.timedOut).toBe(true);
    expect(result.steps[0]?.exitCode).toBeNull();
    expect(result.steps[0]?.durationMs).toBeLessThan(15_000);
  }, 120_000);

  it("stops after a failing step marked stopOnFail", async () => {
    const result = await runner.run({
      repoUrl,
      sha,
      image: "alpine:3.20",
      steps: [step("install", "exit 3", { stopOnFail: true }), step("test", "true")],
    });
    expect(result.steps).toHaveLength(1);
    expect(result.stoppedEarly).toBe(true);
  }, 120_000);

  it("applies a patch before the steps run", async () => {
    const patch = [
      "diff --git a/NOTES.md b/NOTES.md",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/NOTES.md",
      "@@ -0,0 +1 @@",
      "+patched by seller",
      "",
    ].join("\n");
    const result = await runner.run({ repoUrl, sha, image: "alpine:3.20", patch, steps: [step("notes", "cat NOTES.md")] });
    expect(result.steps[0]?.exitCode).toBe(0);
    expect(result.steps[0]?.outputTail).toContain("patched by seller");
  }, 120_000);

  it("cannot write outside the work volume", async () => {
    const result = await runner.run({ repoUrl, sha, image: "alpine:3.20", steps: [step("rootfs", "touch /etc/pwned")] });
    expect(result.steps[0]?.exitCode).not.toBe(0);
  }, 120_000);

  it("rejects a short sha and a non-github url before touching docker", async () => {
    await expect(runner.run({ repoUrl, sha: "7fd1a60", image: "alpine:3.20", steps: [] })).rejects.toThrow(/full 40-char/);
    await expect(runner.run({ repoUrl: "file:///etc", sha, image: "alpine:3.20", steps: [] })).rejects.toThrow(/unsupported repo/);
  });
});
