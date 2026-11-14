import { isVerbatimQuote } from "@unstuck/core";
import { programOf } from "../../lib/programs";
import type { AskView, CommandResult, MilestoneView } from "../../lib/queries";
import type { Study } from "../../lib/study";

/** The study's counts as the problem section states them, read from the stored runs on each request. */
export interface StudyFacts {
  reviews: number;
  programs: string[];
  asks: number;
  missing: number;
}

/** The parts of a built study the landing reads. A whole `Study` fits. */
type StudyCounts = {
  reviews: readonly unknown[];
  programs: readonly Pick<Study["programs"][number], "program">[];
  asks: number;
  verdicts: Pick<Study["verdicts"], "missing">;
};

/** Null until a review has been rerun, so the landing never prints a zero as if it were a finding. */
export function studyFactsOf(study: StudyCounts): StudyFacts | null {
  if (study.reviews.length === 0) return null;
  return { reviews: study.reviews.length, programs: study.programs.map((p) => p.program), asks: study.asks, missing: study.verdicts.missing };
}

/**
 * What the landing shows about its showcase milestone, read once from the stored view. Every field is a stored value
 * or null; a section prints a plainer line when a value is missing, never a made-up one.
 */
export interface Showcase {
  milestoneId: string;
  reviewer: string;
  commentUrl: string;
  program: string;
  thread: ThreadRef | null;
  threadRepo: string;
  /** The ask the run decided: the first one still missing, else the first that works, else the first ask. */
  ask: AskView | null;
  /** That ask's number on the punch list, counted in comment order. */
  askNumber: number;
  /** The words of that ask its check tests, when they're set for this comment and still in the ask word for word. */
  focus: Excerpt | null;
  /** Where those words sit in the comment body, so the hero can strike them and nothing else. */
  focusSpan: Span | null;
  /** The command that decided the ask: its failing step, or its first step when every step passed. */
  check: CommandResult | null;
  /** What that command can and can't see, in plain words, when its exact text has a note. */
  checkScope: string | null;
  runId: string | null;
  ranAt: Date | null;
}

/** A run of characters in the comment body, by offset. */
export interface Span {
  start: number;
  length: number;
}

/** A verbatim run of words cut from an ask, and whether words were left out before and after it. */
export interface Excerpt {
  text: string;
  cutBefore: boolean;
  cutAfter: boolean;
}

/**
 * The clause a showcase check tests, by the reviewer comment it comes from. A long ask opens with its preamble, so
 * next to a check the landing shows this clause instead, and only while the stored ask still holds it word for word.
 */
const CHECKED_CLAUSE: Readonly<Record<string, string>> = {
  "https://github.com/canton-foundation/canton-dev-fund/issues/887#issuecomment-6312277707": "not hosted on one single unified docs page so one can verify",
};

/**
 * What a check can and can't see, by its exact command. A check only tests what its command looks at, so next to one
 * the landing says that plainly. The note shows only while the stored command is exactly this text.
 */
const CHECK_SCOPE: Readonly<Record<string, string>> = {
  "ls mkdocs.yml docusaurus.config.js docusaurus.config.ts book.toml .vitepress/config.ts docs/.vitepress/config.ts 2>/dev/null | grep . || { echo 'error: no docs site config found (mkdocs, docusaurus, mdbook, vitepress)'; exit 1; }":
    "It only looks for a docs site config in the repo, so it can't see a site hosted somewhere else.",
};

export interface ThreadRef {
  kind: "Issue" | "Pull request";
  number: number;
}

const THREAD = /github\.com\/[\w.-]+\/[\w.-]+\/(issues|pull)\/(\d+)/i;

/** The issue or pull request a GitHub thread link points at, or null when the link isn't a thread. */
export function threadRef(url: string): ThreadRef | null {
  const match = THREAD.exec(url);
  if (!match) return null;
  return { kind: match[1]?.toLowerCase() === "pull" ? "Pull request" : "Issue", number: Number(match[2]) };
}

export function decidedAsk<A extends Pick<AskView, "verdict">>(asks: readonly A[]): { ask: A; n: number } | null {
  const ask = asks.find((a) => a.verdict === "missing") ?? asks.find((a) => a.verdict === "done") ?? asks[0];
  return ask ? { ask, n: asks.indexOf(ask) + 1 } : null;
}

interface RunSteps<R> {
  replay: { steps: readonly { askId?: string }[] };
  results: readonly R[];
}

/** The stored result behind an ask's verdict: its failing step, or the first step planned for it. */
export function checkFor<R extends { step: number }>(run: RunSteps<R> | null, ask: Pick<AskView, "id" | "failure"> | null): R | null {
  if (!run || !ask) return null;
  const failedStep = ask.failure?.step;
  if (failedStep !== undefined) return run.results.find((r) => r.step === failedStep) ?? null;
  const planned = new Set(run.replay.steps.flatMap((s, i) => (s.askId === ask.id ? [i + 1] : [])));
  return run.results.find((r) => planned.has(r.step)) ?? null;
}

export function showcaseOf(view: MilestoneView): Showcase {
  const { milestone, asks, base } = view;
  const decided = decidedAsk(asks);
  const clause = CHECKED_CLAUSE[milestone.reviewerCommentUrl ?? ""];
  const check = checkFor(base, decided?.ask ?? null);
  return {
    milestoneId: milestone.id,
    reviewer: milestone.reviewerLogin ?? "Your reviewer",
    commentUrl: milestone.reviewerCommentUrl ?? milestone.threadUrl,
    program: programOf(milestone.threadRepo),
    thread: threadRef(milestone.threadUrl),
    threadRepo: milestone.threadRepo,
    ask: decided?.ask ?? null,
    askNumber: decided?.n ?? 1,
    focus: decided ? excerptOf(decided.ask.quote, clause) : null,
    focusSpan: decided ? spanOf(decided.ask, clause) : null,
    check,
    checkScope: check ? (CHECK_SCOPE[check.command] ?? null) : null,
    runId: base?.replay.id ?? null,
    ranAt: base?.replay.finishedAt ?? null,
  };
}

/**
 * The clause's place in the comment body: the ask's own offset plus where the clause starts inside it. Null when the
 * ask has no offset or doesn't hold the clause character for character, so a mark never lands on the wrong words.
 */
export function spanOf(ask: Pick<AskView, "quote" | "quoteStart">, clause: string | undefined): Span | null {
  if (!clause || ask.quoteStart === null) return null;
  const at = ask.quote.indexOf(clause);
  return at < 0 ? null : { start: ask.quoteStart + at, length: clause.length };
}

const SENTENCE_BREAK = /[.!?]["')\]]?\s+\S/;

/**
 * The line under a comment whose ask is struck only where its check looks, so the rest of the ask isn't mistaken for
 * words nobody picked. It names the whole sentence only when the ask is one sentence that opens the comment, which is
 * exactly what the hero shows above it. Null when nothing was cut.
 */
export function focusNote(ask: Pick<AskView, "quote" | "quoteStart">, focus: Excerpt | null, n: number): string | null {
  if (!focus || (!focus.cutBefore && !focus.cutAfter)) return null;
  const opensWithOneSentence = ask.quoteStart === 0 && !SENTENCE_BREAK.test(ask.quote.trim());
  return opensWithOneSentence
    ? `Ask ${n} is this whole sentence. Its check tests only the marked words.`
    : `Ask ${n} is longer than the marked words, and its check tests only those.`;
}

const PARAGRAPH_BREAK = /\r?\n[ \t]*\r?\n/;

/** Where the paragraph holding `offset` ends: the next blank line, or the end of the body. */
export function paragraphEnd(body: string, offset: number): number {
  const from = Math.min(Math.max(0, offset), body.length);
  const gap = body.slice(from).search(PARAGRAPH_BREAK);
  return gap < 0 ? body.length : from + gap;
}

const flatten = (text: string) => text.replace(/\s+/g, " ").trim();

/** The clause as an excerpt of the quote, or null when there's no clause or the quote doesn't hold it word for word. */
export function excerptOf(quote: string, clause: string | undefined): Excerpt | null {
  if (!clause || !isVerbatimQuote(quote, clause)) return null;
  const whole = flatten(quote);
  const part = flatten(clause);
  const at = whole.indexOf(part);
  return { text: part, cutBefore: at > 0, cutAfter: at + part.length < whole.length };
}

const DAY_MS = 86_400_000;

/** Whole calendar days between two instants, counted on UTC dates. */
export function calendarDays(from: string | Date, to: string | Date): number {
  const utc = (value: string | Date) => {
    const d = new Date(value);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  };
  return Math.round((utc(to) - utc(from)) / DAY_MS);
}
