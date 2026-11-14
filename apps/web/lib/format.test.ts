import { describe, expect, it } from "vitest";
import { reproduceScript, shellQuote, within } from "./format";

describe("shellQuote", () => {
  it("wraps in single quotes and escapes embedded ones", () => {
    expect(shellQuote("echo 'hi'")).toBe(`'echo '\\''hi'\\'''`);
  });
});

describe("reproduceScript", () => {
  const script = reproduceScript({
    repoUrl: "https://github.com/a/b",
    sha: "5e17c99",
    image: "alpine:3.20",
    steps: [
      { name: "docs\nexist", command: "ls docs", network: "none" },
      { name: "install", command: "pnpm i", network: "bridge" },
    ],
  });

  it("fetches exactly the commit into a fresh volume and removes it at the end", () => {
    expect(script).toContain("V=$(docker volume create)");
    expect(script).toContain("-e REPO_URL='https://github.com/a/b' -e SHA='5e17c99'");
    expect(script).toContain('git fetch -q --depth 1 origin "$SHA"');
    expect(script.trimEnd().endsWith('docker volume rm "$V"')).toBe(true);
  });

  it("runs each step with its own network setting and the runner's filesystem", () => {
    expect(script).toContain("# 1. docs exist");
    expect(script).toContain("--network none --read-only --tmpfs /tmp:rw,exec,size=1g");
    expect(script).toContain("--network bridge --read-only --tmpfs /tmp:rw,exec,size=1g");
    expect(script).toContain('-e HOME=/work/.home -e CI=true -v "$V":/work -w /work/repo');
    expect(script).toContain("--cap-drop ALL --security-opt no-new-privileges alpine:3.20");
    expect(script).toContain("sh -lc 'ls docs'");
  });
});

describe("within", () => {
  it("rounds response times the way people say them", () => {
    expect([within(90), within(7200), within(259_200)]).toEqual(["2 min", "2 h", "3 days"]);
  });
});
