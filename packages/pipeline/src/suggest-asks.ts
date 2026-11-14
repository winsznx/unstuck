import { z } from "zod";
import type { NearAi } from "@unstuck/integrations/near-ai";
import { sentencesOf, type Sentence } from "./sentences";

export interface SuggestedAsk extends Sentence {
  /** Why the model counted it as an ask, in a few words. Shown to the grantee, never stored as the ask. */
  reason: string;
}

export interface AskSuggestions {
  asks: SuggestedAsk[];
  model: string;
}

const SYSTEM = [
  "You read one comment a grant reviewer left on a milestone delivery.",
  "An ask is a sentence that requests a change, a fix, a missing deliverable or evidence before the milestone can be accepted.",
  "Greetings, thanks, praise, background, questions answered in the same comment, and plans for later milestones are not asks.",
  "Return the numbers of the sentences that are asks, each with a reason of at most 12 words. Return an empty list when there are none.",
].join(" ");

const SCHEMA = {
  type: "object",
  properties: {
    asks: {
      type: "array",
      items: {
        type: "object",
        properties: { index: { type: "integer" }, reason: { type: "string" } },
        required: ["index", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["asks"],
  additionalProperties: false,
} as const;

const answer = z.object({ asks: z.array(z.object({ index: z.number().int(), reason: z.string() })) });

/**
 * The model only ever picks sentence numbers from UNSTUCK's own split of the comment, so every suggestion is a
 * word-for-word span of the reviewer's text. Numbers outside the list and repeats are dropped, not trusted.
 */
export async function suggestAsks(body: string, ai: NearAi): Promise<AskSuggestions> {
  const sentences = sentencesOf(body);
  if (sentences.length === 0) return { asks: [], model: ai.model };
  const numbered = sentences.map((s, i) => `[${i}] ${s.text}`).join("\n");
  const { value, model } = await ai.json(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: numbered },
    ],
    "asks",
    SCHEMA,
    answer,
  );
  const seen = new Set<number>();
  const asks = value.asks.flatMap((pick) => {
    const sentence = sentences[pick.index];
    if (!sentence || seen.has(pick.index)) return [];
    seen.add(pick.index);
    return [{ ...sentence, reason: pick.reason.trim().slice(0, 140) }];
  });
  return { asks: asks.sort((a, b) => a.start - b.start), model };
}
