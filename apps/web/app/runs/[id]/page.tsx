import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { tellingLine } from "@unstuck/core";
import { AutoRefresh } from "@/components/auto-refresh";
import { QuoteText } from "@/components/fix/quote-text";
import { LogPanel } from "@/components/log-panel";
import { CopyButton } from "@/components/run/copy-button";
import { Elapsed } from "@/components/run/elapsed";
import { StepTag, stepVerdict } from "@/components/run/step-tag";
import { SiteFooter, SiteHeader } from "@/components/site";
import { clock, duration, plural, repoName, reproduceScript, sha7 } from "@/lib/format";
import { programOf } from "@/lib/programs";
import { replayView, type Ask, type CommandResult, type Milestone, type Replay } from "@/lib/queries";
import { stepRows, type StepRow } from "@/lib/status";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = (await params).id;
  const view = await replayView(id);
  if (!view) return { title: "Run record", robots: { index: false, follow: false } };
  const repo = repoName(view.milestone.codeRepoUrl);
  const program = programOf(view.milestone.threadRepo);
  const checks = view.results.filter((r) => r.step > 0).length;
  const where = `${repo} at ${sha7(view.replay.sha)}`;
  const finished = view.replay.status === "finished";
  return {
    ...pageMetadata({
      title: `Run record, ${where}`,
      description: `${finished ? `A rerun of ${plural(checks, "check", "checks")}` : "A rerun"} on ${where}, ${view.replay.target === "patch" ? "with a proposed fix applied" : `the commit the ${program} reviewer saw`}, with every command, exit code and log line.`,
      path: `/runs/${view.replay.id}`,
      type: "article",
    }),
    ...(finished ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const view = await replayView((await params).id);
  if (!view) notFound();
  const { replay, results, milestone, asks } = view;
  const live = replay.status === "queued" || replay.status === "running";
  const rows = stepRows(replay, results);
  const askById = new Map(asks.map((a) => [a.id, a]));
  const checkout = results.find((r) => r.step === 0) ?? null;
  const repo = repoName(milestone.codeRepoUrl);
  const target = replay.target === "patch" ? "a proposed fix" : "the commit the reviewer saw";

  return (
    <>
      <SiteHeader />
      {live && <AutoRefresh />}
      <main id="main-content" className="mx-auto max-w-(--container-content) px-4 pt-6 pb-4 sm:px-6">
        <p className="text-small text-ink-secondary">
          Run record for{" "}
          <Link className="underline underline-offset-4 hover:text-ink" href={`/m/${milestone.id}`}>
            {milestone.threadTitle ?? `${programOf(milestone.threadRepo)} milestone`}
          </Link>
        </p>
        <h1 className="mt-2 text-h1 font-semibold wrap-anywhere">
          {repo} <span className="font-normal text-ink-secondary">at</span> <span className="font-mono text-[0.85em] font-medium">{sha7(replay.sha)}</span>
        </h1>

        <div aria-live="polite" className="mt-6">
          <Verdict replay={replay} rows={rows} target={target} />
        </div>

        <Facts replay={replay} milestone={milestone} checkout={checkout} />

        <section aria-labelledby="steps-title" className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="steps-title" className="text-h2 font-semibold">
              Every step
            </h2>
            <p className="text-small text-ink-secondary tabular-nums">
              {replay.status === "error" ? "None of them ran" : live ? `${rows.filter((r) => r.result).length} of ${rows.length} finished` : `${rows.filter((r) => r.state === "passed").length} of ${rows.length} passed`}
            </p>
          </div>
          <p className="mt-1 max-w-(--container-reading) text-small text-ink-secondary">
            The exact command, where it ran, its exit code and the end of its output. Nothing is summarized away.
          </p>
          <ol className="mt-4 overflow-hidden rounded-panel border border-border bg-surface">
            {checkout && <CheckoutRow result={checkout} />}
            {rows.map((row) => (
              <StepItem key={row.n} row={row} ask={row.askId ? askById.get(row.askId) : undefined} startedAt={replay.startedAt} />
            ))}
          </ol>
        </section>

        <Reproduce replay={replay} repoUrl={milestone.codeRepoUrl ?? ""} />
      </main>
      <SiteFooter />
    </>
  );
}

function Verdict({ replay, rows, target }: { replay: Replay; rows: StepRow[]; target: string }) {
  const failed = rows.filter((r) => r.state === "failed" || r.state === "timed-out").length;
  const skipped = rows.filter((r) => r.state === "skipped").length;
  const ranOn = replay.finishedAt ? ` on ${clock(replay.finishedAt)}` : "";

  if (replay.status === "error") {
    return (
      <Strip tone="error" title="This run couldn't start. Nothing was judged.">
        <p>The runner stopped before any of the reviewer&apos;s steps ran, so no step passed or failed. This is a problem with the run, not with the repo.</p>
        <pre className="mt-3 rounded-control bg-surface-muted px-3 py-2 font-mono text-small whitespace-pre-wrap wrap-anywhere text-ink">{replay.error ?? "No error was recorded."}</pre>
      </Strip>
    );
  }
  if (replay.status === "queued") {
    return (
      <Strip tone="live" title="Waiting for a runner">
        <p>{plural(rows.length, "step is", "steps are")} lined up. They start in order on a fresh copy of {target}. This page updates by itself.</p>
      </Strip>
    );
  }
  if (replay.status === "running") {
    const current = rows.find((r) => r.state === "running");
    return (
      <Strip tone="live" title={current ? `Running step ${current.n} of ${rows.length}` : "Checking out the commit"}>
        <p>
          {current ? <>Now running &ldquo;{current.name}&rdquo;. </> : null}
          {replay.startedAt ? (
            <>
              Started <Elapsed from={replay.startedAt.toISOString()} /> ago.{" "}
            </>
          ) : null}
          This page updates by itself.
        </p>
      </Strip>
    );
  }
  if (failed === 0 && skipped === 0) {
    return (
      <Strip tone="pass" title={rows.length === 1 ? "The check passed" : `All ${rows.length} checks passed`}>
        <p>
          Every step exited 0 on a fresh copy of {target}{ranOn}.
        </p>
      </Strip>
    );
  }
  const stopped = rows.filter((r) => r.state === "failed" || r.state === "timed-out");
  return (
    <Strip tone={failed > 0 ? "fail" : "unsure"} title={failed > 0 ? `${failed} of ${rows.length} ${rows.length === 1 ? "check" : "checks"} failed` : `${skipped} of ${rows.length} ${rows.length === 1 ? "check" : "checks"} didn't run`}>
      <p>
        Ran on a fresh copy of {target}
        {ranOn}.{skipped > 0 && failed > 0 ? ` ${plural(skipped, "step", "steps")} didn't run because an earlier one stopped the run.` : ""} The failing line of each step is marked below.
      </p>
      {stopped.length > 0 && (
        <ul aria-label="Failed steps" className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
          {stopped.map((r) => (
            <li key={r.n}>
              <a className="inline-flex min-h-11 items-center gap-2 font-medium text-ink underline underline-offset-4" href={`#step-${r.n}`}>
                Step {r.n}, {r.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Strip>
  );
}

const STRIP = {
  fail: "border-fails bg-fails-soft",
  pass: "border-passes bg-passes-soft",
  unsure: "border-dashed border-border-strong bg-unsure-soft",
  live: "border-ink bg-surface",
  error: "border-ink bg-surface",
} as const;

function Strip({ tone, title, children }: { tone: keyof typeof STRIP; title: string; children: ReactNode }) {
  return (
    <section aria-label="Result" className={`rounded-panel border-2 px-5 py-4 sm:px-6 sm:py-5 ${STRIP[tone]}`}>
      <h2 className="text-h2 font-semibold">{title}</h2>
      <div className="mt-1 max-w-(--container-reading) text-body text-ink-secondary">{children}</div>
    </section>
  );
}

function Facts({ replay, milestone, checkout }: { replay: Replay; milestone: Milestone; checkout: CommandResult | null }) {
  const took = replay.startedAt && replay.finishedAt ? duration(replay.finishedAt.getTime() - replay.startedAt.getTime()) : null;
  const files = replay.patch ? replay.patch.split("\n").filter((l) => l.startsWith("diff --git")).length : 0;
  return (
    <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 rounded-panel border border-border bg-surface p-5 text-small sm:gap-x-8 sm:p-6 lg:grid-cols-4">
      <Fact term="Commit" wide>
        <span className="flex items-start gap-1">
          <span className="min-w-0 flex-1 py-3 font-mono break-all">{replay.sha}</span>
          <CopyButton value={replay.sha} label="Copy the commit" />
        </span>
      </Fact>
      <Fact term="Repository" full>
        {milestone.codeRepoUrl ? (
          <a className="underline underline-offset-4 wrap-anywhere" href={milestone.codeRepoUrl}>
            {repoName(milestone.codeRepoUrl)}
          </a>
        ) : (
          "Not recorded"
        )}
      </Fact>
      <Fact term="Ran on" full>{replay.target === "patch" ? `A proposed fix, ${plural(files, "file", "files")} changed` : "The reviewed commit, unchanged"}</Fact>
      <Fact term="Image">
        <span className="font-mono break-all">{replay.image}</span>
      </Fact>
      <Fact term="Started">{replay.startedAt ? clock(replay.startedAt) : "Not yet"}</Fact>
      <Fact term="Finished">{replay.finishedAt ? clock(replay.finishedAt) : replay.status === "error" ? "Stopped early" : "Not yet"}</Fact>
      <Fact term="Took">{took ?? (replay.status === "running" ? "Still running" : replay.status === "error" && checkout ? `Stopped after checkout, ${duration(checkout.durationMs)}` : "Not yet")}</Fact>
      <Fact term="Reviewer's comment" full>
        <a className="underline underline-offset-4" href={milestone.reviewerCommentUrl ?? milestone.threadUrl}>
          {milestone.reviewerLogin ?? "The reviewer"} on {programOf(milestone.threadRepo)}
        </a>
      </Fact>
    </dl>
  );
}

function Fact({ term, children, wide = false, full = false }: { term: string; children: ReactNode; wide?: boolean; full?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "col-span-2" : full ? "col-span-2 sm:col-span-1" : ""}`}>
      <dt className="text-ink-secondary">{term}</dt>
      <dd className="m-0 mt-0.5 text-ink">{children}</dd>
    </div>
  );
}

const RAIL = {
  works: "bg-passes",
  missing: "bg-fails",
  open: "bg-open",
  unsure: "bg-border-strong",
  fixed: "bg-passes",
} as const;

function RowShell({ id, rail, active = false, children }: { id: string; rail: keyof typeof RAIL; active?: boolean; children: ReactNode }) {
  return (
    <li id={id} aria-current={active ? "step" : undefined} className={`relative scroll-mt-6 border-t border-border first:border-t-0 ${active ? "bg-open-soft/50" : "target:bg-open-soft/40"}`}>
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${RAIL[rail]}`} />
      <div className="space-y-3 py-5 pr-4 pl-6 sm:pr-6 sm:pl-8">{children}</div>
    </li>
  );
}

function StepHead({ n, name, tag }: { n: number; name: string; tag: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <h3 className="flex min-w-0 items-baseline gap-3 text-h3 font-semibold">
        <span className="w-5 shrink-0 text-small font-semibold text-ink-muted tabular-nums">{n}</span>
        <span className="min-w-0 wrap-anywhere">{name}</span>
      </h3>
      {tag}
    </div>
  );
}

function Command({ command }: { command: string }) {
  return (
    <div className="flex items-start gap-1 rounded-control border border-border bg-surface-muted pl-3">
      <code className="min-w-0 flex-1 py-2.5 font-mono log-type whitespace-pre-wrap wrap-anywhere text-ink">
        <span aria-hidden="true" className="text-ink-muted select-none">
          ${" "}
        </span>
        {command}
      </code>
      <CopyButton value={command} label="Copy the command" />
    </div>
  );
}

function Meta({ network, result }: { network: "none" | "bridge"; result: CommandResult }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-small sm:grid-cols-[auto_auto_minmax(0,1fr)]">
      <div className="flex gap-2 sm:block">
        <dt className="text-ink-muted">Network</dt>
        <dd className="m-0 text-ink">{network === "none" ? "Off" : "On"}</dd>
      </div>
      <div className="flex gap-2 sm:block">
        <dt className="text-ink-muted">Time</dt>
        <dd className="m-0 text-ink">{duration(result.durationMs)}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-ink-muted">
          Output SHA-256, {plural(result.outputBytes, "byte", "bytes")}
        </dt>
        <dd className="m-0 font-mono break-all text-ink">{result.outputSha256}</dd>
      </div>
    </dl>
  );
}

function Output({ n, result, failed }: { n: number; result: CommandResult; failed: boolean }) {
  if (!result.outputTail.trim()) return <p className="text-small text-ink-muted">No output.</p>;
  return (
    <details open={failed} className="group">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-small font-medium text-ink-secondary hover:text-ink">
        <span className="group-open:hidden">Show output</span>
        <span className="hidden group-open:inline">Output{result.outputBytes > 65536 ? ", last 64 KB" : ""}</span>
      </summary>
      <LogPanel output={result.outputTail} highlight={failed ? tellingLine(result.outputTail) : null} label={`Output of step ${n}`} />
    </details>
  );
}

function CheckoutRow({ result }: { result: CommandResult }) {
  const ok = result.exitCode === 0 && result.timedOut === 0;
  const state = result.timedOut === 1 ? "timed-out" : ok ? "passed" : "failed";
  return (
    <RowShell id="step-0" rail={ok ? "works" : "missing"}>
      <StepHead n={0} name="Check out the commit" tag={<StepTag row={{ state, result }} />} />
      <p className="text-small text-ink-secondary">A shallow fetch of exactly this commit into an empty volume. Every step below reads from it.</p>
      <Command command={result.command} />
      <Meta network={result.network === "none" ? "none" : "bridge"} result={result} />
      <Output n={0} result={result} failed={!ok} />
    </RowShell>
  );
}

function StepItem({ row, ask, startedAt }: { row: StepRow; ask: Ask | undefined; startedAt: Date | null }) {
  const failed = row.state === "failed" || row.state === "timed-out";
  const verdict = stepVerdict(row.state);
  return (
    <RowShell id={`step-${row.n}`} rail={row.state === "waiting" ? "unsure" : verdict} active={row.state === "running"}>
      <StepHead n={row.n} name={row.name} tag={<StepTag row={row} />} />
      {ask && (
        <blockquote className="m-0 border-l-2 border-border-strong pl-3">
          <p className="text-small text-ink-secondary">Checks what the reviewer wrote:</p>
          <p className="mt-1 line-clamp-3 font-quote text-body text-ink wrap-anywhere">
            <mark className="ask-mark" data-verdict={verdict}>
              <QuoteText text={ask.quote} />
            </mark>
          </p>
        </blockquote>
      )}
      <Command command={row.command} />
      {row.result ? (
        <>
          <Meta network={row.network} result={row.result} />
          <Output n={row.n} result={row.result} failed={failed} />
        </>
      ) : (
        <p className="text-small text-ink-secondary">
          {row.state === "running" && startedAt ? (
            <>
              Running now. The run has been going for <Elapsed from={startedAt.toISOString()} />.
            </>
          ) : row.state === "running" ? (
            "Running now."
          ) : row.state === "waiting" ? (
            "Waiting for the steps before it."
          ) : (
            "This step never ran, so it has no exit code and no output. It isn't counted as passed or failed."
          )}
        </p>
      )}
    </RowShell>
  );
}

function Reproduce({ replay, repoUrl }: { replay: Replay; repoUrl: string }) {
  if (!repoUrl || replay.steps.length === 0) return null;
  const script = reproduceScript({ repoUrl, sha: replay.sha, image: replay.image, steps: replay.steps });
  return (
    <section aria-labelledby="reproduce-title" className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div>
        <h2 id="reproduce-title" className="text-h2 font-semibold">
          Run it yourself
        </h2>
        <p className="mt-2 text-body text-ink-secondary">
          Anyone with Docker can check this record. Paste the script into a terminal. Each step gets the same image, the same commit and the same network setting as above.
          {replay.patch ? " This run also applied a proposed fix, which the script leaves out, so it checks the reviewed commit." : ""}
        </p>
        <h3 className="mt-6 text-h3 font-semibold">How each step ran</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-small text-ink-secondary marker:text-ink-muted">
          <li>Its own container, removed afterwards</li>
          <li>Read-only system, with a scratch /tmp</li>
          <li>All Linux capabilities dropped, no privilege escalation</li>
          <li>Capped CPU, memory and process count, and a time limit</li>
          <li>Output hashed with SHA-256 in full. The last 64 KB are kept</li>
        </ul>
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-small font-semibold">Script</p>
          <CopyButton value={script} label="Copy the script" />
        </div>
        <pre className="mt-1 rounded-panel bg-log p-4 font-mono log-type whitespace-pre-wrap wrap-anywhere text-log-ink">{script}</pre>
      </div>
    </section>
  );
}
