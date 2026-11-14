import type { ReactNode } from "react";
import { sha7 } from "@/lib/format";
import { LogPanel } from "../log-panel";
import { QuoteText } from "./quote-text";

export interface WorkOrderItem {
  n: number;
  quote: string;
  failure: { step: number; line: string | null; exitCode: number | null; timedOut: boolean } | null;
}

export interface WorkOrderProps {
  repo: string;
  sha: string | null;
  items: WorkOrderItem[];
  checks: { n: number; command: string; offline: boolean }[];
  image: string | null;
}

/**
 * Exactly what the hired agent receives, shown to the owner before they pay. A paper ticket: the punch list to close,
 * the commit to start from, the checks it has to pass, and the limits it works under.
 */
export function WorkOrder({ repo, sha, items, checks, image }: WorkOrderProps) {
  return (
    <article aria-labelledby="work-order-title" className="relative overflow-hidden rounded-sheet border border-border bg-surface shadow-sheet">
      <header className="flex items-center justify-between gap-4 border-b border-dashed border-border-strong px-5 py-4">
        <div className="min-w-0">
          <h2 id="work-order-title" className="text-h3 font-semibold">
            What the agent gets
          </h2>
          <p className="text-small text-ink-secondary">This brief goes out with the hire. Nothing else does.</p>
        </div>
        <span aria-hidden="true" className="size-4 shrink-0 rounded-full border-2 border-border-strong bg-canvas" />
      </header>

      <Section title={items.length === 1 ? "The sentence to close" : `${items.length} sentences to close`}>
        <ol className="space-y-4">
          {items.map((item) => (
            <li key={item.n} className="space-y-2">
              <p className="flex gap-2.5">
                <span className="ask-pin mt-0.5" data-verdict="missing" aria-label={`Ask ${item.n}:`}>
                  {item.n}
                </span>
                <span className="line-clamp-4 min-w-0 font-quote text-body leading-snug wrap-anywhere">
                  <QuoteText text={item.quote} />
                </span>
              </p>
              {item.failure?.line && (
                <LogPanel
                  output={item.failure.line}
                  highlight={item.failure.line}
                  label={`Failing line for ask ${item.n}`}
                  title={<>step {item.failure.step}, {item.failure.timedOut ? "timed out" : `exit ${item.failure.exitCode ?? "?"}`}</>}
                />
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Where it starts">
        <p className="text-body">
          {repo} at{" "}
          <span className="font-mono" title={sha ?? undefined}>
            {sha7(sha)}
          </span>
          , the commit your reviewer saw. Read access only.
        </p>
      </Section>

      {checks.length > 0 && (
        <Section title="What it has to pass">
          <ol className="space-y-2">
            {checks.map((check) => (
              <li key={check.n} className="flex min-w-0 items-start gap-3">
                <span className="w-4 shrink-0 pt-0.5 text-small text-ink-muted tabular-nums">{check.n}</span>
                <code className="min-w-0 flex-1 rounded-control bg-surface-muted px-2.5 py-1.5 font-mono log-type wrap-anywhere text-ink">{check.command}</code>
                <span className="shrink-0 pt-1 text-small text-ink-secondary">{check.offline ? "offline" : "online"}</span>
              </li>
            ))}
          </ol>
          {image && <p className="mt-3 text-small text-ink-secondary">Run in <span className="font-mono">{image}</span>, the same image as the first run.</p>}
        </Section>
      )}

      <Section title="What it never gets" last>
        <ul className="grid gap-1.5 text-small text-ink-secondary sm:grid-cols-2">
          <li>Write access to your repo</li>
          <li>Your keys, tokens or passwords</li>
          <li>Anything outside this commit</li>
          <li>A way to post on the thread</li>
        </ul>
      </Section>
    </article>
  );
}

function Section({ title, children, last = false }: { title: string; children: ReactNode; last?: boolean }) {
  return (
    <section className={`px-5 py-4 ${last ? "" : "border-b border-border"}`}>
      <h3 className="mb-2.5 text-small font-semibold text-ink-secondary">{title}</h3>
      {children}
    </section>
  );
}
