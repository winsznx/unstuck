import { describe, expect, it } from "vitest";
import { compareDiffUrl, parseFixSource } from "./fix-source";

describe("parseFixSource", () => {
  it("reads bare SHAs, commit links and commits inside a pull request", () => {
    expect(parseFixSource(" 5E17C99 ")).toEqual({ kind: "commit", sha: "5e17c99" });
    expect(parseFixSource("https://github.com/a/b/commit/0123456789abcdef0123456789abcdef01234567")).toEqual({
      kind: "commit",
      sha: "0123456789abcdef0123456789abcdef01234567",
    });
    expect(parseFixSource("https://github.com/a/b/pull/12/commits/abcdef1")).toEqual({ kind: "commit", sha: "abcdef1" });
  });

  it("reads pull request links, with or without a tab after the number", () => {
    expect(parseFixSource("https://github.com/ChainSafe/canton-erc20/pull/41/files")).toEqual({ kind: "pull", owner: "ChainSafe", repo: "canton-erc20", number: 41 });
  });

  it("refuses everything else", () => {
    expect(parseFixSource("main")).toBeNull();
    expect(parseFixSource("https://github.com/a/b/issues/3")).toBeNull();
    expect(parseFixSource("https://gitlab.com/a/b/commit/abcdef1")).toBeNull();
  });
});

describe("compareDiffUrl", () => {
  it("diffs the reviewed commit against the fix", () => {
    expect(compareDiffUrl("https://github.com/a/b/", "aaa", "bbb")).toBe("https://github.com/a/b/compare/aaa...bbb.diff");
  });
});
