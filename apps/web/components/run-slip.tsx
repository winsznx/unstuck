import Link from "next/link";
import { tellingLine } from "@unstuck/core";
import { duration, sha7 } from "@/lib/format";
import type { CommandResult } from "@/lib/queries";

/**
 * A stored run, printed like a receipt: one row per command with its exit code, network and time,
 * then the line that decided the verdict. Everything on it comes from command_results.
 */
export function RunSlip({
  repo,
  sha,
  results,
  href,
  className = "",
}: {
  repo: string;
  sha: string | null;
  results: CommandResult[];
  /** Link to the full run record. */
  href?: string;
  className?: string;
}) {
  const failed = results.find((r) => r.step > 0 && (r.exitCode !== 0 || r.timedOut === 1));
  const line = failed ? tellingLine(failed.outputTail) : null;

  return (
    <figure className={`m-0 overflow-hidden rounded-sheet bg-log text-log-ink shadow-sheet ${className}`}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-log-muted/25 px-5 py-3">
        <span className="text-small font-semibold text-log-ink">Rerun on a fresh copy</span>
        <span className="font-mono log-type text-log-muted wrap-anywhere">
          {repo} @ {sha7(sha)}
        </span>
      </figcaption>
      <ol className="divide-y divide-log-muted/15 px-5 font-mono log-type">
        {results.map((r) => {
          const ok = r.exitCode === 0 && r.timedOut !== 1;
          return (
            <li key={r.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-baseline gap-3 py-2.5">
              <span className={ok ? "text-log-pass" : "text-log-fail"}>{r.timedOut === 1 ? "timeout" : `exit ${r.exitCode ?? "?"}`}</span>
              <span className="min-w-0 truncate text-log-ink" title={r.command}>
                {r.step === 0 ? "checkout" : r.name}
              </span>
              <span className="text-log-muted tabular-nums">
                <span className="hidden sm:inline">{r.network === "none" ? "offline " : "online "}</span>
                {duration(r.durationMs)}
              </span>
            </li>
          );
        })}
      </ol>
      {line && (
        <p className="border-t border-log-muted/25 bg-log-ink/5 px-5 py-3 font-mono log-type text-log-fail wrap-anywhere">
          <span className="sr-only">Failing line: </span>
          {line}
        </p>
      )}
      {href && (
        <p className="border-t border-log-muted/25 px-5 py-3 text-small">
          <Link className="font-medium text-open underline-offset-4 hover:underline" href={href}>
            Open the run record
          </Link>
        </p>
      )}
    </figure>
  );
}
