import { describe, expect, it } from "vitest";
import { GitHubClient, parseThreadUrl } from "./thread";

describe("parseThreadUrl", () => {
  it("parses issues, pulls and comment anchors", () => {
    expect(parseThreadUrl("https://github.com/canton-foundation/canton-dev-fund/issues/887#issuecomment-6312277707")).toEqual({
      owner: "canton-foundation",
      repo: "canton-dev-fund",
      number: 887,
      kind: "issue",
    });
    expect(parseThreadUrl("https://github.com/o/r/pull/12").kind).toBe("pull");
  });

  it("rejects other urls", () => {
    expect(() => parseThreadUrl("https://gitlab.com/o/r/issues/1")).toThrow();
    expect(() => parseThreadUrl("https://github.com/o/r/blob/main/README.md")).toThrow();
  });
});

describe.skipIf(!process.env.LIVE)("GitHubClient live (LIVE=1)", () => {
  it("reads the Canton #887 thread including the reviewer's docs comment", async () => {
    const client = new GitHubClient(process.env.GITHUB_TOKEN ? { token: process.env.GITHUB_TOKEN } : {});
    const thread = await client.fetchThread(parseThreadUrl("https://github.com/canton-foundation/canton-dev-fund/issues/887"));
    const reviewer = thread.comments.find((c) => c.id === "ic_6312277707");
    expect(reviewer?.body).toContain("not hosted on one single unified docs page");
  }, 30_000);
});
