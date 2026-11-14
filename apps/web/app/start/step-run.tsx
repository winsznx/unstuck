import Link from "next/link";
import { Button } from "@/components/button";
import { PunchTag } from "@/components/tag";
import { day, repoName } from "@/lib/format";
import type { CodeRead, ThreadComment } from "./actions";
import type { FlowState, Step } from "./flow-state";
import { Facts, Problem, StepActions } from "./ui";

function Change({ step, label, onEdit, disabled }: { step: Step; label: string; onEdit: (step: Step) => void; disabled: boolean }) {
  return (
    <Button type="button" variant="quiet" disabled={disabled} onClick={() => onEdit(step)} className="min-h-0 text-small">
      Change<span className="sr-only"> {label}</span>
    </Button>
  );
}

export function RunStep({
  state,
  comment,
  code,
  pending,
  error,
  startedId,
  onRun,
  onEdit,
}: {
  state: FlowState;
  comment: ThreadComment;
  code: CodeRead;
  pending: boolean;
  error: string | null;
  startedId: string | null;
  onRun: () => void;
  onEdit: (step: Step) => void;
}) {
  const busy = pending || startedId !== null;
  const sha7 = code.commit.sha.slice(0, 7);
  const install = state.install.trim();
  const checks = state.asks.filter((a) => a.command.trim()).length;

  if (startedId) {
    return (
      <div role="status" className="rounded-panel border border-border bg-surface-muted px-5 py-5">
        <p className="flex items-center gap-2.5 font-semibold">
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-open-edge motion-reduce:animate-none" />
          Run queued. Opening your milestone.
        </p>
        <p className="mt-1 text-ink-secondary">The page updates on its own while the steps run, usually in under two minutes.</p>
        <Link href={`/m/${startedId}`} className="mt-3 inline-block font-medium underline underline-offset-4">
          Open the milestone page
        </Link>
      </div>
    );
  }

  return (
    <>
      <Facts
        rows={[
          {
            term: "Comment",
            value: (
              <>
                <a href={comment.url} target="_blank" rel="noreferrer" className="font-semibold underline-offset-4 hover:underline">
                  {comment.author}
                </a>{" "}
                on {day(comment.createdAt)}
              </>
            ),
            action: <Change step="comment" label="comment" onEdit={onEdit} disabled={busy} />,
          },
          {
            term: "Code",
            value: (
              <>
                {repoName(code.repoUrl)} at <span className="font-mono text-small">{sha7}</span>
                <span className="block text-small text-ink-secondary">{code.commit.message}</span>
              </>
            ),
            action: <Change step="code" label="code" onEdit={onEdit} disabled={busy} />,
          },
          {
            term: "Setup",
            value: (
              <>
                <span className="font-mono text-small">{state.image}</span>
                <span className="mt-0.5 block font-mono text-small break-all text-ink-secondary">{install || "Nothing to install"}</span>
              </>
            ),
            action: <Change step="steps" label="setup" onEdit={onEdit} disabled={busy} />,
          },
        ]}
      />

      <div className="mt-8 flex items-baseline justify-between gap-4">
        <h3 className="font-semibold">The punch list</h3>
        <Change step="asks" label="asks" onEdit={onEdit} disabled={busy} />
      </div>
      <ol className="mt-3 divide-y divide-border rounded-panel border border-border bg-surface">
        {state.asks.map((ask, i) => (
          <li key={ask.start} className="grid gap-2 px-4 py-3.5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:px-5">
            <span>
              <PunchTag verdict={ask.command.trim() ? "open" : "unsure"} n={i + 1} />
            </span>
            <div className="min-w-0">
              <p className="font-quote text-body leading-relaxed wrap-anywhere">{ask.text}</p>
              {ask.command.trim() ? (
                <code className="mt-1.5 block truncate font-mono text-small text-ink-secondary" title={ask.command}>
                  {ask.command}
                </code>
              ) : (
                <p className="mt-1.5 text-small text-ink-secondary">No check. This ask will be marked Not sure.</p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {checks === 0 && (
        <div className="mt-6">
          <Problem
            title="Nothing to run yet"
            action={
              <Button type="button" variant="secondary" disabled={busy} onClick={() => onEdit("steps")}>
                Add a check
              </Button>
            }
          >
            None of these asks has a check, so a run couldn&apos;t tell you anything about them. Add a check to at least one ask.
          </Problem>
        </div>
      )}

      <h3 className="mt-8 font-semibold">When you press Run</h3>
      <ol className="mt-3 space-y-2.5">
        {[
          `A fresh copy of ${repoName(code.repoUrl)} is checked out at ${sha7}, inside a sealed container that can't see your accounts.`,
          install ? "The install runs with the network on." : "There's no install, so the checks start straight away.",
          `${checks} ${checks === 1 ? "check runs" : "checks run"} with the network off, each in a fresh container.`,
          "Each ask gets a tag on your milestone page: Works, Still missing or Not sure, with the log line that decided it.",
        ].map((line, i) => (
          <li key={line} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
            <span className="text-small font-semibold text-ink-muted tabular-nums">{i + 1}</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-small text-ink-secondary">Nothing is posted to GitHub and nothing is charged. Anyone with the link can see the run record.</p>

      {error && !pending && (
        <div className="mt-6">
          <Problem title="The run didn't start">{error}</Problem>
        </div>
      )}

      <StepActions
        note={pending ? "Checking the comment against GitHub, then saving" : `${state.asks.length} ${state.asks.length === 1 ? "ask" : "asks"}, ${checks} ${checks === 1 ? "check" : "checks"}`}
        back={
          <Button type="button" variant="quiet" disabled={busy} onClick={() => onEdit("steps")}>
            Back
          </Button>
        }
      >
        <Button type="button" onClick={onRun} disabled={busy || checks === 0} aria-busy={pending}>
          {pending ? "Starting the run" : error ? "Try again" : "Run the reviewer's steps"}
        </Button>
      </StepActions>
    </>
  );
}
