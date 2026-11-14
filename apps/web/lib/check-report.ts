import { programOf } from "./programs";
import type { MilestoneView } from "./queries";

/**
 * The answer `unstuck check <thread-url>` returns, whether it's asked by a person, an MCP client or a job on
 * NEAR Agent Market. Built only from stored rows: a verdict here always has a run record behind it.
 */
export interface CheckReport {
  program: string;
  thread: string;
  comment: { author: string | null; url: string | null; at: string | null };
  code: { repo: string | null; commit: string | null };
  status: "still_missing" | "works" | "not_sure" | "running" | "could_not_run" | "no_checks";
  asks: ReportAsk[];
  runRecord: string | null;
  milestone: string;
  brief: string;
}

export interface ReportAsk {
  n: number;
  quote: string;
  severity: "blocks_payment" | "nit" | "unclear";
  verdict: "still_missing" | "works" | "not_sure" | "open";
  failure: { step: number; check: string; exitCode: number | null; timedOut: boolean; line: string | null; record: string } | null;
}

const VERDICT: Record<MilestoneView["asks"][number]["verdict"], ReportAsk["verdict"]> = {
  missing: "still_missing",
  done: "works",
  unsure: "not_sure",
  open: "open",
};

export function checkReport(view: MilestoneView, origin: string): CheckReport {
  const { milestone, base } = view;
  const record = base ? `${origin}/runs/${base.replay.id}` : null;
  const asks: ReportAsk[] = view.asks.map((ask, i) => ({
    n: i + 1,
    quote: ask.quote,
    severity: ask.severity,
    verdict: VERDICT[ask.verdict],
    failure:
      ask.failure && record
        ? {
            step: ask.failure.step,
            check: ask.failure.name,
            exitCode: ask.failure.exitCode,
            timedOut: ask.failure.timedOut,
            line: ask.failure.line,
            record: `${record}#step-${ask.failure.step}`,
          }
        : null,
  }));

  return {
    program: programOf(milestone.threadRepo),
    thread: milestone.threadUrl,
    comment: { author: milestone.reviewerLogin, url: milestone.reviewerCommentUrl, at: milestone.reviewerCommentAt?.toISOString() ?? null },
    code: { repo: milestone.codeRepoUrl, commit: milestone.pinnedSha },
    status: statusOf(view, asks),
    asks,
    runRecord: record,
    milestone: `${origin}/m/${milestone.id}`,
    brief: briefOf(milestone.reviewerLogin, milestone.pinnedSha, asks),
  };
}

function statusOf(view: MilestoneView, asks: readonly ReportAsk[]): CheckReport["status"] {
  const replay = view.base?.replay;
  if (!replay || replay.steps.length === 0) return "no_checks";
  if (replay.status === "queued" || replay.status === "running") return "running";
  if (replay.status === "error") return "could_not_run";
  if (asks.some((a) => a.verdict === "still_missing")) return "still_missing";
  if (asks.length > 0 && asks.every((a) => a.verdict === "works")) return "works";
  return "not_sure";
}

/** The plain-text hand-off a fixing agent reads first: what's open, where it fails, and the bar a fix has to clear. */
function briefOf(reviewer: string | null, sha: string | null, asks: readonly ReportAsk[]): string {
  const open = asks.filter((a) => a.verdict === "still_missing");
  if (open.length === 0) return "Nothing is still missing at the reviewed commit.";
  const who = reviewer ?? "The reviewer";
  const at = sha ? sha.slice(0, 7) : "the reviewed commit";
  const lines = open.map((a) => {
    const where = a.failure ? ` Check "${a.failure.check}" ${a.failure.timedOut ? "ran out of time" : `exits ${a.failure.exitCode}`}${a.failure.line ? `: ${a.failure.line}` : ""}.` : "";
    return `${a.n}. "${a.quote}"${where}`;
  });
  return [`${who} asked for ${open.length === 1 ? "one thing that is" : `${open.length} things that are`} still missing at ${at}:`, ...lines, "A fix is done when the same checks exit 0 on the patch."].join("\n");
}
