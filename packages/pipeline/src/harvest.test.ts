import { describe, expect, it } from "vitest";
import type { Thread } from "@unstuck/integrations/github";
import { assess, codeReposIn, learnReviewers } from "./harvest";

const comment = (id: string, author: string, body: string, createdAt: string) => ({
  id,
  kind: "issue_comment" as const,
  author,
  authorAssociation: "NONE",
  body,
  createdAt,
  url: `https://github.com/o/r/issues/1#${id}`,
});

const thread = (comments: ReturnType<typeof comment>[]): Thread => ({
  ref: { owner: "o", repo: "r", number: 1, kind: "issue" },
  title: "Milestone 2",
  body: "Code: https://github.com/acme/widget",
  author: "grantee",
  state: "open",
  url: "https://github.com/o/r/issues/1",
  headSha: null,
  comments,
});

const now = new Date("2026-11-06T00:00:00Z");
const reviewers = new Set(["rev"]);

describe("assess", () => {
  it("flags a reviewer ask the grantee hasn't answered", () => {
    const c = assess("P", thread([comment("ic_1", "rev", "Tests fail on a clean install. Please fix the README too.", "2026-11-01T00:00:00Z")]), reviewers, now);
    expect(c?.granteeRepliedAfter).toBe(false);
    expect(c?.daysSinceReview).toBe(5);
    expect(c?.codeRepos).toEqual(["https://github.com/acme/widget"]);
    expect(c?.signals).toEqual(expect.arrayContaining(["fails", "request", "docs", "tests"]));
  });

  it("skips threads that are already approved", () => {
    const t = thread([
      comment("ic_1", "rev", "Tests fail. Please fix.", "2026-11-01T00:00:00Z"),
      comment("ic_2", "rev", "Thanks, the milestone is approved.", "2026-11-03T00:00:00Z"),
    ]);
    expect(assess("P", t, reviewers, now)).toBeNull();
  });

  it("ignores non-reviewers, bots, and a reviewer-roster member who posted the delivery report", () => {
    const t = thread([
      comment("ic_1", "grantee", "Tests fail, please fix, I know", "2026-11-01T00:00:00Z"),
      comment("ic_2", "ci[bot]", "Build failed, please fix", "2026-11-01T00:00:00Z"),
      comment("ic_3", "rev", "# Milestone 2 delivery is complete. Please add notes; tests fail on windows", "2026-11-02T00:00:00Z"),
    ]);
    expect(assess("P", t, reviewers, now)).toBeNull();
  });

  it("marks a failed vote and a grantee reply after the review", () => {
    const t = thread([
      comment("ic_1", "rev", "We could not reproduce the build. Please provide steps.", "2026-11-01T00:00:00Z"),
      comment("ic_2", "git-vote[bot]", "## Vote closed\n\nThe vote **did not pass**.", "2026-11-02T00:00:00Z"),
      comment("ic_3", "grantee", "Working on it", "2026-11-03T00:00:00Z"),
    ]);
    const c = assess("P", t, reviewers, now);
    expect(c?.voteFailed).toBe(true);
    expect(c?.granteeRepliedAfter).toBe(true);
  });

  it("needs a concrete ask, not just a mention of docs or tests", () => {
    const t = thread([comment("ic_1", "rev", "Went through the docs and tests, looks thorough.", "2026-11-01T00:00:00Z")]);
    expect(assess("P", t, reviewers, now)).toBeNull();
  });
});

describe("codeReposIn", () => {
  it("dedupes, strips .git and drops the thread repo", () => {
    const text = "see https://github.com/a/b.git and https://github.com/a/b/tree/main/docs and https://github.com/o/r/issues/2";
    expect(codeReposIn(text, "o", "r")).toEqual(["https://github.com/a/b"]);
  });

  it("skips GitHub pages that aren't repos", () => {
    const text = "https://github.com/user-attachments/assets/1 https://github.com/orgs/x/people https://github.com/c/d";
    expect(codeReposIn(text, "o", "r")).toEqual(["https://github.com/c/d"]);
  });
});

describe("learnReviewers", () => {
  it("keeps people who comment across many threads and drops bots", () => {
    const threads = Array.from({ length: 5 }, (_, i) =>
      thread([comment(`ic_${i}`, "rev", "x", "2026-11-01T00:00:00Z"), comment(`b_${i}`, "vote[bot]", "x", "2026-11-01T00:00:00Z"), comment(`g_${i}`, `grantee${i}`, "x", "2026-11-01T00:00:00Z")]),
    );
    expect([...learnReviewers(threads)]).toEqual(["rev"]);
  });
});
