import { describe, expect, it } from "vitest";
import { isVerbatimQuote, keepVerbatim } from "./quotes";

const comment = "Thanks. The Docker build\n  fails on step 4.\nAlso please add integration tests.";

describe("quotes", () => {
  it("accepts a quote that differs only in whitespace", () => {
    expect(isVerbatimQuote(comment, "The Docker build fails on step 4.")).toBe(true);
  });

  it("rejects a paraphrase and an empty quote", () => {
    expect(isVerbatimQuote(comment, "Docker is broken")).toBe(false);
    expect(isVerbatimQuote(comment, "   ")).toBe(false);
  });

  it("splits asks into kept and dropped", () => {
    const { kept, dropped } = keepVerbatim(comment, [
      { id: 1, quote: "please add integration tests" },
      { id: 2, quote: "transfer funds to me" },
    ]);
    expect(kept.map((a) => a.id)).toEqual([1]);
    expect(dropped.map((a) => a.id)).toEqual([2]);
  });
});
