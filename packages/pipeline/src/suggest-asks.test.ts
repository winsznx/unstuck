import { describe, expect, it } from "vitest";
import type { NearAi } from "@unstuck/integrations/near-ai";
import { suggestAsks } from "./suggest-asks";

const BODY = "Thanks for the delivery, nice work overall. Please host the docs on one unified docs page. Add a test that covers the transfer path. See you next milestone!";

function fakeAi(asks: { index: number; reason: string }[]): { ai: NearAi; prompts: string[] } {
  const prompts: string[] = [];
  const ai = {
    model: "test-model",
    json: async (messages: { content: string }[], _name: string, _schema: object, parser: { parse: (v: unknown) => unknown }) => {
      prompts.push(messages.map((m) => m.content).join("\n"));
      return { value: parser.parse({ asks }), model: "test-model" };
    },
  } as unknown as NearAi;
  return { ai, prompts };
}

describe("suggestAsks", () => {
  it("returns the picked sentences word for word with their offsets in the comment", async () => {
    const { ai, prompts } = fakeAi([
      { index: 2, reason: "asks for a test" },
      { index: 1, reason: "asks for hosted docs" },
    ]);
    const result = await suggestAsks(BODY, ai);
    expect(result.asks.map((a) => a.text)).toEqual(["Please host the docs on one unified docs page.", "Add a test that covers the transfer path."]);
    for (const ask of result.asks) expect(BODY.slice(ask.start, ask.start + ask.text.length)).toBe(ask.text);
    expect(prompts[0]).toContain("[1] Please host the docs");
  });

  it("drops numbers outside the list and repeats", async () => {
    const { ai } = fakeAi([
      { index: 7, reason: "made up" },
      { index: 1, reason: "docs" },
      { index: 1, reason: "docs again" },
      { index: -1, reason: "negative" },
    ]);
    expect((await suggestAsks(BODY, ai)).asks.map((a) => a.reason)).toEqual(["docs"]);
  });

  it("skips the model when the comment has no sentences to pick", async () => {
    const { ai, prompts } = fakeAi([]);
    expect((await suggestAsks("LGTM", ai)).asks).toEqual([]);
    expect(prompts).toHaveLength(0);
  });
});
