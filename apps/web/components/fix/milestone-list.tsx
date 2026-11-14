import Link from "next/link";
import type { MilestoneSummary } from "@/app/m/actions";
import { QUEUE_ORDER, type QueueGroup } from "@/lib/fix-shared";
import { day, repoName, sha7 } from "@/lib/format";
import { programOf } from "@/lib/programs";
import { PunchTag } from "../tag";

const GROUP: Record<QueueGroup, { title: string; detail: string }> = {
  send: { title: "Ready to send", detail: "The fix passes every check. Post the pull request and your reply." },
  fixing: { title: "Being fixed", detail: "An agent is working, or its change is being checked." },
  fix: { title: "Needs a fix", detail: "A rerun shows something your reviewer asked for still fails." },
  running: { title: "Running", detail: "Your reviewer's steps are running now." },
  error: { title: "Couldn't run", detail: "The runner stopped before the steps ran. Nothing was judged." },
  "no-checks": { title: "No checks yet", detail: "There are no steps to run, so nothing has been judged." },
  unsure: { title: "Not fully tested", detail: "Nothing failed, but some sentences had no check." },
  ready: { title: "Ready for your reviewer", detail: "Every check passes. Send the run record." },
};

/** Milestones grouped by what they need next, most urgent first. Each row is one held payment. */
export function MilestoneList({ items, onForget }: { items: MilestoneSummary[]; onForget?: (id: string) => void }) {
  const groups = QUEUE_ORDER.map((group) => ({ group, rows: items.filter((i) => i.group === group) })).filter((g) => g.rows.length > 0);
  return (
    <div className="space-y-10">
      {groups.map(({ group, rows }) => (
        <section key={group} aria-labelledby={`group-${group}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border-strong pb-2">
            <h2 id={`group-${group}`} className="text-h3 font-semibold">
              {GROUP[group].title} <span className="font-normal text-ink-muted tabular-nums">{rows.length}</span>
            </h2>
            <p className="text-small text-ink-secondary">{GROUP[group].detail}</p>
          </div>
          <ul>
            {rows.map((row) => (
              <li key={row.id} className="flex items-stretch border-b border-border">
                <Link
                  href={`/m/${row.id}`}
                  className="grid min-h-11 min-w-0 flex-1 gap-x-6 gap-y-2 py-4 pr-2 hover:bg-surface-muted md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-3"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink wrap-anywhere">{row.title}</span>
                    <span className="mt-0.5 block text-small text-ink-secondary wrap-anywhere">
                      {programOf(row.threadRepo)}, reviewed by {row.reviewer ?? "unknown"}
                      {row.askedAt ? ` on ${day(row.askedAt)}` : ""}. {repoName(row.codeRepoUrl)} at <span className="font-mono">{sha7(row.pinnedSha)}</span>
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 md:justify-end">
                    <RowState row={row} />
                  </span>
                </Link>
                {onForget && (
                  <button
                    type="button"
                    onClick={() => onForget(row.id)}
                    aria-label={`Remove ${row.title} from this list`}
                    className="min-h-11 shrink-0 self-center px-2 text-small text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function RowState({ row }: { row: MilestoneSummary }) {
  if (row.runStep) {
    return <PunchTag verdict="open">{row.runStep.current === 0 ? "Waiting to start" : `Step ${row.runStep.current} of ${row.runStep.total}`}</PunchTag>;
  }
  if (!row.tally) return <PunchTag verdict="unsure">{row.group === "error" ? "Didn't run" : "No checks"}</PunchTag>;
  return (
    <>
      {(row.fixed ?? 0) > 0 && <PunchTag verdict="fixed">{`${row.fixed} fixed`}</PunchTag>}
      {row.tally.missing > 0 && row.group !== "send" && <PunchTag verdict="missing">{`${row.tally.missing} still missing`}</PunchTag>}
      {row.tally.works > 0 && <PunchTag verdict="works">{`${row.tally.works} ${row.tally.works === 1 ? "works" : "work"}`}</PunchTag>}
      {row.tally.unsure > 0 && <PunchTag verdict="unsure">{`${row.tally.unsure} not sure`}</PunchTag>}
    </>
  );
}
