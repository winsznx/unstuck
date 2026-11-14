import { firstFailure, tellingLine, verdictFor, type AskVerdict } from "@unstuck/core";
import type { Ask, AskView, MilestoneView, ReplayView } from "./queries";
import { milestoneStatus } from "./status";
import type { JobStatus, PartLink, QueueGroup } from "./fix-shared";

export * from "./fix-shared";

export type Failure = NonNullable<AskView["failure"]>;
export type Judged = { verdict: AskVerdict | "open"; failure: Failure | null };

/** Judges each ask against one replay. Only a finished replay yields a verdict; anything else stays open. */
export function judge(asks: readonly Pick<Ask, "id">[], run: ReplayView | null): Map<string, Judged> {
  const out = new Map<string, Judged>();
  if (!run || run.replay.status !== "finished") {
    for (const ask of asks) out.set(ask.id, { verdict: "open", failure: null });
    return out;
  }
  const planned = run.replay.steps.map((s, i) => ({ step: i + 1, askId: s.askId }));
  const outcomes = run.results.filter((r) => r.step > 0).map((r) => ({ step: r.step, exitCode: r.exitCode, timedOut: r.timedOut === 1 }));
  for (const ask of asks) {
    const own = outcomes.filter((o) => planned.find((p) => p.step === o.step)?.askId === ask.id);
    const failed = firstFailure(own);
    const row = failed ? run.results.find((r) => r.step === failed.step) : undefined;
    out.set(ask.id, {
      verdict: verdictFor(ask.id, planned, outcomes),
      failure: row ? { step: row.step, name: row.name, line: tellingLine(row.outputTail), exitCode: row.exitCode, timedOut: row.timedOut === 1 } : null,
    });
  }
  return out;
}

export type Change = "fixed" | "still-missing" | "broke" | "still-works" | "unsure" | "pending";

export interface AskChange {
  ask: AskView;
  n: number;
  before: Judged;
  after: Judged;
  change: Change;
}

export function changeOf(before: AskVerdict | "open", after: AskVerdict | "open"): Change {
  if (after === "open") return "pending";
  if (after === "unsure") return "unsure";
  if (after === "missing") return before === "done" ? "broke" : "still-missing";
  return before === "done" ? "still-works" : "fixed";
}

export const latestPatch = (view: Pick<MilestoneView, "patches">): ReplayView | null => view.patches[0] ?? null;

export function compareAsks(view: Pick<MilestoneView, "asks" | "patches">, patch: ReplayView | null = latestPatch(view)): AskChange[] {
  const after = judge(view.asks, patch);
  return view.asks.map((ask, i) => {
    const a = after.get(ask.id) ?? { verdict: "open" as const, failure: null };
    return { ask, n: i + 1, before: { verdict: ask.verdict, failure: ask.failure }, after: a, change: changeOf(ask.verdict, a.verdict) };
  });
}

export interface Gate {
  label: string;
  met: boolean;
}

export type SendReadiness =
  | { kind: "ready"; source: "base" | "patch"; run: ReplayView; changes: AskChange[]; untested: AskChange[] }
  | { kind: "locked"; gates: Gate[]; reason: "no-run" | "no-fix" | "checking" | "check-error" | "fix-fails" | "no-asks" };

/** Send opens only when a finished run shows nothing still missing: the reviewed commit itself, or the latest fix. */
export function sendReadiness(view: Pick<MilestoneView, "asks" | "base" | "patches">): SendReadiness {
  const status = milestoneStatus(view);
  const baseDone = status.kind === "finished";
  const baseClean = baseDone && status.tally.missing === 0;
  const patch = latestPatch(view);
  const changes = compareAsks(view, patch);

  if (view.asks.length === 0) {
    return { kind: "locked", reason: "no-asks", gates: [{ label: "At least one sentence picked from the review", met: false }] };
  }
  if (baseClean && view.base) {
    const untested = changes.filter((c) => c.before.verdict !== "done");
    const baseChanges = changes.map((c) => ({ ...c, after: c.before, change: c.before.verdict === "done" ? ("still-works" as const) : ("unsure" as const) }));
    return { kind: "ready", source: "base", run: view.base, changes: baseChanges, untested };
  }

  const fixFinished = patch?.replay.status === "finished";
  const fixClean = fixFinished && changes.every((c) => c.after.verdict !== "missing");
  const gates: Gate[] = [
    { label: "Your reviewer's steps were rerun on the reviewed commit", met: baseDone },
    { label: "A fix came back from Agent Market", met: patch !== null },
    { label: "The same steps passed on the fix", met: Boolean(fixClean) },
  ];
  if (!baseDone) return { kind: "locked", reason: "no-run", gates };
  if (!patch) return { kind: "locked", reason: "no-fix", gates };
  if (patch.replay.status === "error") return { kind: "locked", reason: "check-error", gates };
  if (!fixFinished) return { kind: "locked", reason: "checking", gates };
  if (!fixClean) return { kind: "locked", reason: "fix-fails", gates };
  return { kind: "ready", source: "patch", run: patch, changes, untested: changes.filter((c) => c.after.verdict !== "done") };
}

export interface DraftInput {
  reviewer: string | null;
  threadUrl: string;
  repo: string;
  sha: string | null;
  program: string;
  changes: AskChange[];
  source: "base" | "patch";
  /** Absolute URL of the run that shows the result, without a fragment. */
  runUrl: string;
  /** Absolute URL of the run on the reviewed commit, when it differs from runUrl. */
  baseRunUrl?: string;
  /** The checks that judged each ask in the result run, keyed by ask id, in step order. */
  checksFor: Record<string, DraftCheck[] | undefined>;
  /** The owner's pull request, once they've opened it. Until then the draft holds a marked gap for it. */
  prUrl?: string;
}

export interface DraftCheck {
  n: number;
  command: string;
  offline: boolean;
}

export const PR_LINK_GAP = "<paste your pull request link>";
export const CONFIRM_LINE = "Please confirm that each command tests what you asked.";

const allChecks = (input: DraftInput) => Object.values(input.checksFor).flatMap((c) => c ?? []);
const networkNote = (input: DraftInput) => (allChecks(input).every((c) => c.offline) ? ", network off" : "");
const stepLinks = (input: DraftInput, checks: DraftCheck[]) => checks.map((c) => `[step ${c.n}](${input.runUrl}#step-${c.n})`).join(", ");
const short = (command: string) => (command.length > 90 ? `${command.slice(0, 87)}...` : command);

const sha7 = (sha: string | null) => (sha ? sha.slice(0, 7) : "the reviewed commit");
const quote = (text: string) => text.split("\n").map((l) => `> ${l}`).join("\n");

/**
 * The reply the owner can post under the review. It reports what each check did and nothing more: a passing check is
 * evidence, so it never says "fixed" or "done", and it asks the reviewer to confirm each command tests their ask.
 */
export function replyDraft(input: DraftInput): string {
  const who = input.reviewer ? `@${input.reviewer}` : "Thanks for the review.";
  const network = networkNote(input);
  const opening =
    input.source === "patch"
      ? `${who} the changes for your review are in ${input.prUrl ?? PR_LINK_GAP}. I reran the checks for each point on a fresh copy with the change applied${network}. Every link below goes to the exact step.`
      : `${who} I reran the checks for each point on a fresh copy of ${input.repo} at ${sha7(input.sha)}, the last commit before your review${network}. Every link below goes to the exact step.`;
  const blocks = input.changes.map((c) => {
    const checks = input.checksFor[c.ask.id] ?? [];
    const now = input.source === "patch" ? "now " : "";
    const where = input.source === "patch" ? "on the fix" : `at ${sha7(input.sha)}`;
    let line: string;
    if (c.after.verdict !== "done" || checks.length === 0) line = "I couldn't check this one automatically, so please look at it directly.";
    else if (checks.length === 1) line = `The check \`${short(checks[0]!.command)}\` ${now}exits 0 ${where}: ${input.runUrl}#step-${checks[0]!.n}`;
    else line = `All ${checks.length} checks for it ${now}exit 0 ${where}: ${stepLinks(input, checks)}.`;
    return `${quote(c.ask.quote)}\n\n${line}`;
  });
  const tail = input.source === "patch" && input.baseRunUrl ? `\n\nThe same checks failing before the fix: ${input.baseRunUrl}` : "";
  return `${opening}\n\n${blocks.join("\n\n")}${tail}\n\n${CONFIRM_LINE} Each run record has a script to rerun it yourself.`;
}

export function prDraft(input: DraftInput): { title: string; body: string } {
  const fixed = input.changes.filter((c) => c.change === "fixed");
  const title = `Address review: ${fixed[0]?.ask.summary ?? `${fixed.length} item${fixed.length === 1 ? "" : "s"} from ${input.program}`}`.slice(0, 120);
  const rows = input.changes.map((c) => {
    const checks = input.checksFor[c.ask.id] ?? [];
    const before = c.before.verdict === "missing" ? `fails${c.before.failure?.exitCode != null ? ` (exit ${c.before.failure.exitCode})` : ""}` : c.before.verdict === "done" ? "passes" : "not checked";
    const after = c.after.verdict === "done" && checks.length > 0 ? `passes (${stepLinks(input, checks)})` : "not checked";
    return `| ${c.n} | ${c.ask.quote.replace(/\s+/g, " ").replace(/\|/g, "\\|").slice(0, 140)} | ${before} | ${after} |`;
  });
  const body = [
    `Addresses the review${input.reviewer ? ` by @${input.reviewer}` : ""} on ${input.threadUrl}.`,
    "",
    `| # | Reviewer asked | At ${sha7(input.sha)} | With this change |`,
    "| - | - | - | - |",
    ...rows,
    "",
    `Each check ran in a fresh container${networkNote(input) ? " with the network off" : ""}.`,
    "",
    `- With this change: ${input.runUrl}`,
    ...(input.baseRunUrl ? [`- Before: ${input.baseRunUrl}`] : []),
  ].join("\n");
  return { title, body };
}

export interface AgentLike {
  agent_id: string;
  name: string;
  description: string | null;
  tags: string[];
  listing_status: string;
  available_now: boolean;
  funding_paused: boolean;
  delivered_jobs: number;
  success_rate: number | null;
}

export interface PlanLike {
  price_amount: string;
  is_default: boolean;
  listing_status: string;
}

export function defaultPlan<P extends PlanLike>(plans: readonly P[]): P | null {
  const live = plans.filter((p) => p.listing_status === "live");
  return live.find((p) => p.is_default) ?? live[0] ?? null;
}

const FIX_WORDS = [/\bfix/, /\bbugs?\b/, /\bdebug/, /\bpatch/, /\bpull requests?\b/, /\bgithub\b/, /\brepo(s|sitory|sitories)?\b/, /\brefactor/, /\btests?\b/, /\bcoding tasks?\b/, /\bimplement/];

/** How clearly a listing says it changes code in a repo. Zero means it doesn't, such as a pure review or a legal citation checker. */
export function fixRelevance(agent: Pick<AgentLike, "name" | "description" | "tags">): number {
  const text = `${agent.name} ${agent.description ?? ""} ${agent.tags.join(" ")}`.toLowerCase();
  return FIX_WORDS.filter((word) => word.test(text)).length;
}

/** Agents that can fix code in a repo, hireable first, then by how clearly they say so, then by track record. */
export function rankAgents<A extends AgentLike>(agents: readonly A[], hireable: (a: A) => boolean): A[] {
  return agents
    .map((a, i) => ({ a, i, r: fixRelevance(a) }))
    .filter((x) => x.r > 0)
    .sort((x, y) => {
      const h = Number(hireable(y.a)) - Number(hireable(x.a));
      if (h) return h;
      if (y.r !== x.r) return y.r - x.r;
      const d = y.a.delivered_jobs - x.a.delivered_jobs;
      if (d) return d;
      const s = (y.a.success_rate ?? -1) - (x.a.success_rate ?? -1);
      return s || x.i - y.i;
    })
    .map(({ a }) => a);
}

export function queueGroup(view: Pick<MilestoneView, "asks" | "base" | "patches">, latestJob: JobStatus | null = null): QueueGroup {
  const status = milestoneStatus(view);
  switch (status.kind) {
    case "queued":
    case "running":
      return "running";
    case "error":
      return "error";
    case "no-checks":
      return "no-checks";
    case "finished": {
      if (status.tally.missing === 0) return status.tally.unsure > 0 ? "unsure" : "ready";
      if (sendReadiness(view).kind === "ready") return "send";
      const patch = latestPatch(view);
      if (patch && (patch.replay.status === "queued" || patch.replay.status === "running")) return "fixing";
      if (!patch && latestJob && latestJob !== "failed" && latestJob !== "refunded") return "fixing";
      return "fix";
    }
  }
}

/** Where each of the five parts stands, from stored runs and jobs only. */
export function partsFor(view: Pick<MilestoneView, "milestone" | "asks" | "base" | "patches">, latestJob: JobStatus | null = null): PartLink[] {
  const id = view.milestone.id;
  const status = milestoneStatus(view);
  const finished = status.kind === "finished";
  const stillMissing = finished && status.tally.missing > 0;
  const allWork = finished && status.tally.missing === 0 && status.tally.unsure === 0;
  const patch = latestPatch(view);
  const ready = sendReadiness(view).kind === "ready";

  const two: Pick<PartLink, "state" | "status"> =
    status.kind === "queued"
      ? { state: "current", status: "Waiting to start" }
      : status.kind === "running"
        ? { state: "current", status: `Step ${status.current} of ${status.total}` }
        : status.kind === "error"
          ? { state: "current", status: "Couldn't run" }
          : status.kind === "no-checks"
            ? { state: "current", status: "No steps yet" }
            : { state: "done", status: stillMissing ? `${status.tally.missing} still missing` : allWork ? "All work" : `${status.tally.unsure} not sure` };

  let three: Pick<PartLink, "state" | "status">;
  if (!stillMissing) three = allWork ? { state: "skipped", status: "Not needed" } : { state: "later", status: "After the run" };
  else if (patch) three = { state: "done", status: "Fix in" };
  else if (latestJob === "failed" || latestJob === "refunded") three = { state: "current", status: "Hire again" };
  else if (latestJob) three = { state: "current", status: latestJob === "sent" ? "Waiting on the agent" : latestJob === "accepted" ? "Accepted" : latestJob === "working" ? "Agent working" : "Delivered" };
  else three = { state: "current", status: "Choose an agent" };

  let four: Pick<PartLink, "state" | "status">;
  if (allWork) four = { state: "skipped", status: "Not needed" };
  else if (!patch) four = stillMissing ? { state: "later", status: "Paste your fix" } : { state: "later", status: "After a fix" };
  else if (patch.replay.status === "queued" || patch.replay.status === "running") four = { state: "current", status: "Checking the fix" };
  else if (patch.replay.status === "error") four = { state: "current", status: "Couldn't run" };
  else four = ready ? { state: "done", status: "Passes" } : { state: "current", status: "Still failing" };

  const five: Pick<PartLink, "state" | "status"> = ready ? { state: "current", status: allWork ? "Tell your reviewer" : "Ready to send" } : { state: "later", status: "After it passes" };

  return [
    { n: 1, name: "Read", state: "done", status: "Done", href: `/m/${id}#part-1` },
    { n: 2, name: "Missing", ...two, href: `/m/${id}#part-2` },
    { n: 3, name: "Fix", ...three, href: `/m/${id}/fix` },
    { n: 4, name: "Check", ...four, href: `/m/${id}/check` },
    { n: 5, name: "Send", ...five, href: `/m/${id}/send` },
  ];
}
