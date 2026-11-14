import Link from "next/link";
import type { ReactNode } from "react";
import type { AskChange, Change, Judged } from "@/lib/fix";
import { sha7 } from "@/lib/format";
import { LogPanel } from "../log-panel";
import { PunchTag, tagFor, type TagVerdict } from "../tag";
import { QuoteText } from "./quote-text";

const AFTER_TAG: Record<Change, { verdict: TagVerdict; label?: string }> = {
  fixed: { verdict: "fixed" },
  "still-missing": { verdict: "missing" },
  broke: { verdict: "missing", label: "Broke on the fix" },
  "still-works": { verdict: "works" },
  unsure: { verdict: "unsure" },
  pending: { verdict: "open", label: "Waiting" },
};

export interface AskCompareProps {
  changes: AskChange[];
  baseSha: string | null;
  baseRunId: string | null;
  patchRunId: string | null;
  /** What the right column says while there's no finished fix run, such as "Waiting for a fix". */
  pendingLabel?: string;
}

/** Each ask on the reviewed commit next to the same ask on the fix. Fixed only appears when a stored fix run passed it. */
export function AskCompare({ changes, baseSha, baseRunId, patchRunId, pendingLabel = "Waiting for a fix" }: AskCompareProps) {
  return (
    <ol aria-label="Each ask before and after the fix" className="overflow-hidden rounded-panel border border-border bg-surface">
      <li aria-hidden="true" className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-6 border-b border-border bg-surface-muted px-5 py-2 text-small font-semibold text-ink-secondary md:grid">
        <span>Your reviewer asked</span>
        <span>At {sha7(baseSha)}, as reviewed</span>
        <span>With the fix</span>
      </li>
      {changes.map((c) => {
        const after = AFTER_TAG[c.change];
        return (
          <li key={c.ask.id} className="grid gap-4 border-t border-border px-5 py-5 first:border-t-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-6">
            <p className="flex min-w-0 gap-2.5">
              <span className="ask-pin mt-1" data-verdict={tagFor(c.ask.verdict)} aria-label={`Ask ${c.n}:`}>
                {c.n}
              </span>
              <span className="line-clamp-4 min-w-0 font-quote text-body leading-snug wrap-anywhere">
                <QuoteText text={c.ask.quote} />
              </span>
            </p>
            <Side label={`At ${sha7(baseSha)}`} tag={<PunchTag verdict={tagFor(c.before.verdict)} />} judged={c.before} runId={baseRunId} />
            <Side
              label="With the fix"
              tag={c.change === "pending" ? <PunchTag verdict="open">{pendingLabel}</PunchTag> : <PunchTag verdict={after.verdict}>{after.label}</PunchTag>}
              judged={c.after}
              runId={patchRunId}
            />
          </li>
        );
      })}
    </ol>
  );
}

function Side({ label, tag, judged, runId }: { label: string; tag: ReactNode; judged: Judged; runId: string | null }) {
  const failure = judged.verdict === "missing" ? judged.failure : null;
  return (
    <div className="min-w-0 space-y-2">
      <p className="flex items-center gap-2">
        <span className="text-small text-ink-secondary md:sr-only">{label}</span>
        {tag}
      </p>
      {failure && (
        <>
          <p className="text-small text-ink-secondary">
            Step {failure.step} {failure.timedOut ? "ran out of time" : `exited ${failure.exitCode ?? "unknown"}`}:
          </p>
          <LogPanel output={failure.line ?? "The step printed nothing."} highlight={failure.line} label={`Failing line, ${label}`} />
        </>
      )}
      {runId && judged.verdict !== "open" && (
        <Link className="inline-flex min-h-11 items-center text-small font-medium underline underline-offset-4" href={`/runs/${runId}${failure ? `#step-${failure.step}` : ""}`}>
          {failure ? `Step ${failure.step} in the run record` : "Run record"}
        </Link>
      )}
    </div>
  );
}
