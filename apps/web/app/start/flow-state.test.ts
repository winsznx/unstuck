import { describe, expect, it } from "vitest";
import type { CodeRead, ThreadRead } from "./actions";
import { canOpen, initialState, reducer } from "./flow-state";
import { shapeOf } from "./repo-shape";

const thread: ThreadRead = {
  threadUrl: "https://github.com/o/r/issues/1",
  repo: "o/r",
  title: "Milestone 1",
  author: "grantee",
  state: "open",
  kind: "issue",
  comments: [
    { id: "ic_1", kind: "issue_comment", author: "rev", association: "MEMBER", createdAt: "2026-11-01T00:00:00Z", url: "u1", body: "Please add docs." },
    { id: "ic_2", kind: "issue_comment", author: "rev", association: "MEMBER", createdAt: "2026-11-02T00:00:00Z", url: "u2", body: "Tests fail." },
  ],
  suggestedCommentId: "ic_2",
  suggestedBecause: "reviewer",
  repoCandidates: ["https://github.com/acme/widget"],
  prHead: null,
};

const code = (sha: string): CodeRead => ({
  repoUrl: "https://github.com/acme/widget",
  commit: { sha, message: "docs", committedAt: "2026-10-30T00:00:00Z", author: "a" },
  shape: shapeOf(["package.json", "pnpm-lock.yaml"], { scripts: { test: "vitest" } }),
});

describe("start flow", () => {
  it("starts on the suggested comment", () => {
    expect(initialState(thread).commentId).toBe("ic_2");
  });

  it("keeps picked asks when the same comment is confirmed again", () => {
    let s = reducer(initialState(thread), { type: "comment", commentId: "ic_2" });
    s = reducer(s, { type: "code", code: code("a".repeat(40)) });
    s = reducer(s, { type: "toggleAsk", start: 0, text: "Tests fail.", command: "" });
    expect(reducer(s, { type: "comment", commentId: "ic_2" }).asks).toHaveLength(1);
  });

  it("drops picked asks and the commit when another comment is chosen", () => {
    let s = reducer(initialState(thread), { type: "comment", commentId: "ic_2" });
    s = reducer(s, { type: "code", code: code("a".repeat(40)) });
    s = reducer(s, { type: "toggleAsk", start: 0, text: "Tests fail.", command: "" });
    const changed = reducer(s, { type: "comment", commentId: "ic_1" });
    expect([changed.asks.length, changed.code]).toEqual([0, null]);
  });

  it("picks the image and install from the repo at that commit", () => {
    const s = reducer(reducer(initialState(thread), { type: "comment", commentId: "ic_2" }), { type: "code", code: code("a".repeat(40)) });
    expect([s.image, s.install]).toEqual(["node:22-bookworm-slim", "npm i -g --prefix /work/.tools pnpm@9 && /work/.tools/bin/pnpm install --frozen-lockfile"]);
  });

  it("keeps an edited install when the same commit is confirmed again", () => {
    let s = reducer(reducer(initialState(thread), { type: "comment", commentId: "ic_2" }), { type: "code", code: code("a".repeat(40)) });
    s = reducer(s, { type: "install", install: "custom" });
    expect(reducer(s, { type: "code", code: code("a".repeat(40)) }).install).toBe("custom");
  });

  it("toggles an ask off and keeps commands per ask, in comment order", () => {
    let s = reducer(initialState(thread), { type: "toggleAsk", start: 5, text: "b", command: "" });
    s = reducer(s, { type: "toggleAsk", start: 0, text: "a", command: "ls docs" });
    s = reducer(s, { type: "askCommand", start: 5, command: "pnpm test" });
    expect(s.asks).toEqual([
      { start: 0, text: "a", command: "ls docs" },
      { start: 5, text: "b", command: "pnpm test" },
    ]);
    expect(reducer(s, { type: "toggleAsk", start: 0, text: "a", command: "" }).asks.map((a) => a.start)).toEqual([5]);
  });

  it("only opens a step once every step before it is done", () => {
    const s = initialState(thread);
    expect([canOpen(s, "comment"), canOpen(s, "asks")]).toEqual([true, false]);
    const coded = reducer(reducer(s, { type: "comment", commentId: "ic_2" }), { type: "code", code: code("a".repeat(40)) });
    expect([canOpen(coded, "asks"), canOpen(coded, "run")]).toEqual([true, false]);
  });

  it("ignores a jump to a step that can't open yet", () => {
    expect(reducer(initialState(thread), { type: "goto", step: "run" }).step).toBe("comment");
  });
});
