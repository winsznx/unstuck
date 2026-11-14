import { describe, expect, it } from "vitest";
import type { Thread } from "@unstuck/integrations/github";
import { headShaApplies, pickReviewerComment } from "./import-thread";

describe("headShaApplies", () => {
  it("uses the PR head only when the code lives in the thread's repo", () => {
    expect(headShaApplies("https://github.com/o/r", "https://github.com/O/r", "abc")).toBe("abc");
    expect(headShaApplies("https://github.com/o/r.git", "https://github.com/o/r", "abc")).toBe("abc");
    expect(headShaApplies("https://github.com/ChainSupport/eliza-dot-aes", "https://github.com/w3f/Grant-Milestone-Delivery", "abc")).toBeNull();
    expect(headShaApplies(null, "https://github.com/o/r", "abc")).toBeNull();
  });
});

describe("pickReviewerComment", () => {
  const thread = {
    author: "grantee",
    comments: [
      { id: "ic_1", author: "reviewer", body: "please fix tests" },
      { id: "ic_2", author: "grantee", body: "done" },
      { id: "ic_3", author: "github-actions[bot]", body: "fill the invoice" },
    ],
  } as unknown as Thread;

  it("picks the latest non-author, non-bot comment by default", () => {
    expect(pickReviewerComment(thread)?.id).toBe("ic_1");
  });

  it("accepts a bare numeric comment id", () => {
    expect(pickReviewerComment(thread, "2")?.id).toBe("ic_2");
  });
});
