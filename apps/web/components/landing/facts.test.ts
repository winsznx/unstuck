import { describe, expect, it } from "vitest";
import { calendarDays, checkFor, decidedAsk, excerptOf, focusNote, paragraphEnd, spanOf, studyFactsOf, threadRef } from "./facts";
import { PUBLIC_REVIEW } from "./public-review";

const failure = (step: number) => ({ step, name: `step ${step}`, line: "no docs site config", exitCode: 1, timedOut: false });

const run = (askIds: (string | undefined)[], exitCodes: number[]) => ({
  replay: { steps: askIds.map((askId) => (askId === undefined ? {} : { askId })) },
  results: exitCodes.map((exitCode, step) => ({ step, exitCode })),
});

describe("threadRef", () => {
  it("reads an issue and its number", () => {
    // #given
    const url = "https://github.com/canton-foundation/canton-dev-fund/issues/887";
    // #when
    const ref = threadRef(url);
    // #then
    expect(ref).toEqual({ kind: "Issue", number: 887 });
  });

  it("reads a pull request and its number, ignoring a comment anchor", () => {
    // #given
    const url = "https://github.com/w3f/Grant-Milestone-Delivery/pull/1296#issuecomment-3597000564";
    // #when
    const ref = threadRef(url);
    // #then
    expect(ref).toEqual({ kind: "Pull request", number: 1296 });
  });

  it("returns null for a repository link", () => {
    // #given
    const url = "https://github.com/ChainSafe/canton-erc20";
    // #when
    const ref = threadRef(url);
    // #then
    expect(ref).toBeNull();
  });
});

describe("decidedAsk", () => {
  it("prefers the first ask that is still missing", () => {
    // #given
    const asks = [
      { id: "a", verdict: "done" as const },
      { id: "b", verdict: "missing" as const },
    ];
    // #when
    const decided = decidedAsk(asks);
    // #then
    expect(decided).toEqual({ ask: asks[1], n: 2 });
  });

  it("falls back to the first ask that works", () => {
    // #given
    const asks = [
      { id: "a", verdict: "open" as const },
      { id: "b", verdict: "done" as const },
    ];
    // #when
    const decided = decidedAsk(asks);
    // #then
    expect(decided).toEqual({ ask: asks[1], n: 2 });
  });

  it("falls back to the first ask when nothing was decided", () => {
    // #given
    const asks = [{ id: "a", verdict: "open" as const }];
    // #when
    const decided = decidedAsk(asks);
    // #then
    expect(decided).toEqual({ ask: asks[0], n: 1 });
  });

  it("returns null without asks", () => {
    // #given
    const asks: { verdict: "open" }[] = [];
    // #when
    const decided = decidedAsk(asks);
    // #then
    expect(decided).toBeNull();
  });
});

describe("checkFor", () => {
  it("returns the failing step of an ask that is still missing", () => {
    // #given
    const stored = run(["a", "a"], [0, 0, 1]);
    // #when
    const check = checkFor(stored, { id: "a", failure: failure(2) });
    // #then
    expect(check?.step).toBe(2);
  });

  it("returns the first step planned for an ask when nothing failed", () => {
    // #given
    const stored = run(["x", "a"], [0, 0, 0]);
    // #when
    const check = checkFor(stored, { id: "a", failure: null });
    // #then
    expect(check?.step).toBe(2);
  });

  it("returns null when there is no run", () => {
    // #given
    const stored = null;
    // #when
    const check = checkFor(stored, { id: "a", failure: null });
    // #then
    expect(check).toBeNull();
  });

  it("returns null when no step was planned for the ask", () => {
    // #given
    const stored = run(["x"], [0, 0]);
    // #when
    const check = checkFor(stored, { id: "a", failure: null });
    // #then
    expect(check).toBeNull();
  });
});

describe("excerptOf", () => {
  const quote = "there are many markdown docs files yes but not hosted on one single unified docs page so one can verify, THIS NEEDS WORK";

  it("cuts the clause out of the ask and marks what was left out on each side", () => {
    // #given
    const clause = "not hosted on one single unified docs page so one can verify";
    // #when
    const excerpt = excerptOf(quote, clause);
    // #then
    expect(excerpt).toEqual({ text: clause, cutBefore: true, cutAfter: true });
  });

  it("marks no cut on a side where the clause meets the end of the ask", () => {
    // #given
    const clause = "there are many markdown docs files";
    // #when
    const excerpt = excerptOf(quote, clause);
    // #then
    expect(excerpt).toEqual({ text: clause, cutBefore: false, cutAfter: true });
  });

  it("refuses a clause that isn't in the ask word for word", () => {
    // #given
    const clause = "not hosted on a single docs page";
    // #when
    const excerpt = excerptOf(quote, clause);
    // #then
    expect(excerpt).toBeNull();
  });

  it("returns null when no clause is set", () => {
    // #given
    const clause = undefined;
    // #when
    const excerpt = excerptOf(quote, clause);
    // #then
    expect(excerpt).toBeNull();
  });
});

describe("spanOf", () => {
  const body = "Intro line.\n\nA Major Gap. there are many markdown docs files yes but not hosted on one single unified docs page so one can verify, THIS NEEDS WORK";
  const quote = body.slice(body.indexOf("A Major Gap"));
  const ask = { quote, quoteStart: body.indexOf("A Major Gap") };

  it("places the clause in the comment body at the ask's offset plus its place in the ask", () => {
    // #given
    const clause = "not hosted on one single unified docs page so one can verify";
    // #when
    const span = spanOf(ask, clause);
    // #then
    expect(span && body.slice(span.start, span.start + span.length)).toBe(clause);
  });

  it("refuses a clause the ask doesn't hold character for character", () => {
    // #given
    const clause = "not  hosted on one single unified docs page";
    // #when
    const span = spanOf(ask, clause);
    // #then
    expect(span).toBeNull();
  });

  it("returns null for an ask without an offset", () => {
    // #given
    const unplaced = { quote, quoteStart: null };
    // #when
    const span = spanOf(unplaced, "not hosted");
    // #then
    expect(span).toBeNull();
  });
});

describe("focusNote", () => {
  const clause = "not hosted on one single unified docs page so one can verify";
  const sentence = "A Major Gap is it has missing information, there are many markdown docs files yes but not hosted on one single unified docs page so one can verify, THIS NEEDS WORK.";

  it("calls the ask the whole sentence when it is one sentence opening the comment", () => {
    // #given
    const ask = { quote: sentence, quoteStart: 0 };
    // #when
    const note = focusNote(ask, excerptOf(sentence, clause), 1);
    // #then
    expect(note).toBe("Ask 1 is this whole sentence. Its check tests only the marked words.");
  });

  it("doesn't call a two-sentence ask one sentence", () => {
    // #given
    const quote = `Docs are thin. ${sentence}`;
    const ask = { quote, quoteStart: 0 };
    // #when
    const note = focusNote(ask, excerptOf(quote, clause), 1);
    // #then
    expect(note).toBe("Ask 1 is longer than the marked words, and its check tests only those.");
  });

  it("doesn't call the text above one sentence when the ask starts later in the comment", () => {
    // #given
    const ask = { quote: sentence, quoteStart: 40 };
    // #when
    const note = focusNote(ask, excerptOf(sentence, clause), 2);
    // #then
    expect(note).toBe("Ask 2 is longer than the marked words, and its check tests only those.");
  });

  it("says nothing when the clause is the whole ask", () => {
    // #given
    const ask = { quote: clause, quoteStart: 0 };
    // #when
    const note = focusNote(ask, excerptOf(clause, clause), 1);
    // #then
    expect(note).toBeNull();
  });
});

describe("paragraphEnd", () => {
  it("stops at the blank line after the offset", () => {
    // #given
    const body = "First paragraph @someone\r\n\r\nFor everyone's ref:\n- docs";
    // #when
    const end = paragraphEnd(body, 3);
    // #then
    expect(body.slice(0, end)).toBe("First paragraph @someone");
  });

  it("runs to the end of a body with one paragraph", () => {
    // #given
    const body = "Only one paragraph,\nwrapped once.";
    // #when
    const end = paragraphEnd(body, 0);
    // #then
    expect(end).toBe(body.length);
  });
});

describe("studyFactsOf", () => {
  it("states nothing before a review has been rerun", () => {
    // #given
    const study = { reviews: [], programs: [], asks: 0, verdicts: { missing: 0, works: 0, unsure: 0 } };
    // #when
    const facts = studyFactsOf(study);
    // #then
    expect(facts).toBeNull();
  });

  it("counts reviews, programs, asks and the asks still missing", () => {
    // #given
    const study = {
      reviews: [{ key: "a" }, { key: "b" }],
      programs: [{ program: "Canton Dev Fund" }],
      asks: 3,
      verdicts: { missing: 2 },
    };
    // #when
    const facts = studyFactsOf(study);
    // #then
    expect(facts).toEqual({ reviews: 2, programs: ["Canton Dev Fund"], asks: 3, missing: 2 });
  });
});

describe("calendarDays", () => {
  it("counts UTC calendar days whatever the hour", () => {
    // #given
    const lateNight = "2025-12-01T23:59:00Z";
    const justAfter = "2025-12-02T00:01:00Z";
    // #when
    const days = calendarDays(lateNight, justAfter);
    // #then
    expect(days).toBe(1);
  });

  it("puts the public review's first evaluation 23 days after delivery", () => {
    // #given
    const { deliveredAt, firstReviewAt } = PUBLIC_REVIEW;
    // #when
    const days = calendarDays(deliveredAt, firstReviewAt);
    // #then
    expect(days).toBe(23);
  });

  it("puts the public review's acceptance 38 days after the first evaluation", () => {
    // #given
    const { firstReviewAt, acceptedAt } = PUBLIC_REVIEW;
    // #when
    const days = calendarDays(firstReviewAt, acceptedAt);
    // #then
    expect(days).toBe(38);
  });

  it("puts the public review's acceptance 61 days after delivery", () => {
    // #given
    const { deliveredAt, acceptedAt } = PUBLIC_REVIEW;
    // #when
    const days = calendarDays(deliveredAt, acceptedAt);
    // #then
    expect(days).toBe(61);
  });
});

describe("PUBLIC_REVIEW", () => {
  it("lists the four outstanding issues the problem section counts", () => {
    // #given
    const { outstanding } = PUBLIC_REVIEW;
    // #when
    const count = outstanding.length;
    // #then
    expect(count).toBe(4);
  });

  it("dates both later reviews between the first evaluation and acceptance", () => {
    // #given
    const { firstReviewAt, laterReviewsAt, acceptedAt } = PUBLIC_REVIEW;
    // #when
    const inside = laterReviewsAt.filter((at) => at > firstReviewAt && at <= acceptedAt);
    // #then
    expect(inside).toHaveLength(2);
  });

  it("quotes an issue the first evaluation lists, linked to the version it was quoted from", () => {
    // #given
    const { issue, outstanding, evaluationUrl } = PUBLIC_REVIEW;
    // #when
    const linked = issue.url.startsWith(evaluationUrl);
    // #then
    expect(linked && issue.number >= 1 && issue.number <= outstanding.length).toBe(true);
  });
});
