import { describe, expect, it } from "vitest";
import { isVerbatimQuote } from "@unstuck/core";
import { sentencesOf } from "./sentences";

const body = `A Major Gap I have seen in evidence is it has missing information for self verification by commitee, most of it has to be from person's own side of verification which we can't verify on our end, there are many markdown docs files yes but not hosted on one single unified docs page so one can verify, THIS NEEDS IMMDEATE WORK TO BE DONE for Builders and Commitee. @Eunoia-cym

For everyone's ref, since repos are not given here, I am giving them here:
- docs: https://github.com/ChainSafe/canton-erc20/tree/main/docs
- Middleware repo: https://github.com/ChainSafe/canton-middleware`;

describe("sentencesOf", () => {
  it("returns verbatim, offset-accurate pieces of the comment", () => {
    for (const s of sentencesOf(body)) {
      expect(body.slice(s.start, s.start + s.text.length)).toBe(s.text);
      expect(isVerbatimQuote(body, s.text)).toBe(true);
    }
  });

  it("keeps the reviewer's ask and strips bullets", () => {
    const texts = sentencesOf(body).map((s) => s.text);
    expect(texts[0]).toContain("not hosted on one single unified docs page");
    expect(texts.some((t) => t.startsWith("docs: https://github.com/ChainSafe/canton-erc20"))).toBe(true);
    expect(texts.every((t) => !t.startsWith("- "))).toBe(true);
  });

  it("drops fragments without real words", () => {
    expect(sentencesOf("Ok.\n\n:+1:\n\nPlease add integration tests for the bridge.").map((s) => s.text)).toEqual([
      "Please add integration tests for the bridge.",
    ]);
  });
});
