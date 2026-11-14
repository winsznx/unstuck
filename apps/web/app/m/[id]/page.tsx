import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { LogPanel } from "@/components/log-panel";
import { QuoteText } from "@/components/fix/quote-text";
import { MilestoneComment } from "@/components/milestone-card";
import { Elapsed } from "@/components/run/elapsed";
import { StepTag } from "@/components/run/step-tag";
import { ButtonLink } from "@/components/button";
import { Part } from "@/components/section";
import { PunchTag, tagFor } from "@/components/tag";
import { clock, day, duration, plural, repoName, sha7 } from "@/lib/format";
import { isJobStatus, latestPatch, partsFor, sendReadiness, type PartLink } from "@/lib/fix";
import { programOf } from "@/lib/programs";
import { jobsFor, milestoneView, type AskView, type MilestoneView } from "@/lib/queries";
import { milestoneStatus, stepRows, wholeDaysBetween, type MilestoneStatus, type StepRow } from "@/lib/status";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const view = await milestoneView((await params).id);
  return { title: view?.milestone.threadTitle ?? "Milestone" };
}

export default async function MilestonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [view, jobs] = await Promise.all([milestoneView(id), jobsFor(id)]);
  if (!view) notFound();
  const { milestone, asks, base } = view;
  const status = milestoneStatus(view);
  const rows = base ? stepRows(base.replay, base.results) : [];
  const live = status.kind === "queued" || status.kind === "running";
  const parts = partsFor(view, jobs[0] && isJobStatus(jobs[0].status) ? jobs[0].status : null);
  const looseRows = rows.filter((r) => !r.askId || !asks.some((a) => a.id === r.askId));

  return (
    <main id="main-content" className="mx-auto max-w-(--container-content) px-4 pt-8 pb-4 sm:px-6">
      {live && <AutoRefresh />}
      <div aria-live="polite">
        <StatusStrip view={view} status={status} rows={rows} />
      </div>

      <div className="mt-10 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-24">
          <Part n={1} title="What your reviewer said" state="done" status={parts[0]!.status}>
            <MilestoneComment view={view} />
            <p className="text-small text-ink-muted">
              {asks.length > 0
                ? `${plural(asks.length, "sentence is", "sentences are")} marked. Each is quoted word for word from the comment.`
                : "No sentence was marked, so the checks below stand on their own."}
            </p>
          </Part>
        </div>

        <div className="min-w-0 space-y-14">
          <Part n={2} title={partTwoTitle(status)} state={parts[1]!.state} status={status.kind === "finished" ? undefined : parts[1]!.status}>
            {status.kind === "no-checks" && (
              <Empty>
                No steps were given, so nothing ran. Every sentence stays Not sure until it has a check.{" "}
                <Link className="font-medium text-ink underline underline-offset-4" href={`/start?url=${encodeURIComponent(milestone.reviewerCommentUrl ?? milestone.threadUrl)}`}>
                  Add steps and run again
                </Link>
              </Empty>
            )}
            {status.kind === "error" && (
              <Empty>
                Nothing was judged, so no sentence is marked Still missing.{" "}
                <Link className="font-medium text-ink underline underline-offset-4" href={`/start?url=${encodeURIComponent(milestone.reviewerCommentUrl ?? milestone.threadUrl)}`}>
                  Start the run again
                </Link>
              </Empty>
            )}
            {live && base && <LiveSteps rows={rows} startedAt={base.replay.startedAt} />}
            {asks.length > 0 && (
              <ul aria-label="What your reviewer asked for" className="overflow-hidden rounded-panel border border-border bg-surface">
                {asks.map((ask, i) => (
                  <AskRow key={ask.id} n={i + 1} ask={ask} rows={rows.filter((r) => r.askId === ask.id)} runId={base?.replay.id} />
                ))}
              </ul>
            )}
            {!live && looseRows.length > 0 && base && (
              <div>
                <h3 className="text-h3 font-semibold">{asks.length > 0 ? "Checks not tied to a sentence" : "The checks"}</h3>
                <ul className="mt-3 overflow-hidden rounded-panel border border-border bg-surface">
                  {looseRows.map((row) => (
                    <LooseRow key={row.n} row={row} runId={base.replay.id} />
                  ))}
                </ul>
              </div>
            )}
            {base && (
              <p className="text-small text-ink-secondary">
                <Link className="font-medium text-ink underline underline-offset-4" href={`/runs/${base.replay.id}`}>
                  Open the run record
                </Link>{" "}
                for every command, exit code, output hash and a script to rerun it yourself.
              </p>
            )}
          </Part>

          <NextParts view={view} parts={parts} rows={rows} />
        </div>
      </div>
    </main>
  );
}

function partTwoTitle(status: MilestoneStatus): string {
  switch (status.kind) {
    case "finished": {
      const { missing, works, unsure } = status.tally;
      const total = missing + works + unsure;
      const noun = status.counting === "asks" ? ["thing", "things"] : ["check", "checks"];
      if (missing === 0 && unsure === 0) return total === 1 ? `The ${noun[0]} works` : `All ${total} ${noun[1]} work`;
      if (total === 1) return missing === 1 ? "Still missing" : "Couldn't be tested";
      return missing > 0 ? `${missing} of ${total} ${noun[1]} still missing` : `${unsure} of ${total} ${noun[1]} not tested`;
    }
    case "running":
    case "queued":
      return "Running your reviewer's steps";
    case "error":
      return "The run couldn't start";
    case "no-checks":
      return "What's missing";
  }
}

const STRIP = {
  fail: "border-fails bg-fails-soft",
  pass: "border-passes bg-passes-soft",
  unsure: "border-dashed border-border-strong bg-unsure-soft",
  plain: "border-ink bg-surface",
} as const;

function StatusStrip({ view, status, rows }: { view: MilestoneView; status: MilestoneStatus; rows: StepRow[] }) {
  const { milestone } = view;
  const repo = repoName(milestone.codeRepoUrl);
  const asked = milestone.reviewerCommentAt ? new Date(milestone.reviewerCommentAt) : null;
  const waited = asked ? wholeDaysBetween(asked, new Date()) : null;
  const askedLine = asked ? `${milestone.reviewerLogin ?? "Your reviewer"} asked on ${day(asked)}${waited ? `, ${plural(waited, "day", "days")} ago` : ""}.` : "";

  let tone: keyof typeof STRIP = "plain";
  let title: string;
  let body: ReactNode;
  let side: ReactNode = null;

  switch (status.kind) {
    case "finished": {
      const { missing, works, unsure } = status.tally;
      const total = missing + works + unsure;
      const things = status.counting === "asks" ? "things your reviewer asked for" : "checks";
      tone = missing > 0 ? "fail" : unsure > 0 ? "unsure" : "pass";
      const one = status.counting === "asks" ? "The one thing your reviewer asked for" : "The one check";
      title =
        missing > 0
          ? total === 1
            ? `${one} is still missing`
            : `${missing} of ${total} ${things} ${missing === 1 ? "is" : "are"} still missing`
          : unsure > 0
            ? total === 1
              ? `${one} couldn't be tested`
              : `${unsure} of ${total} ${things} couldn't be tested`
            : `Everything your reviewer asked for works at ${sha7(milestone.pinnedSha)}`;
      body = (
        <>
          {askedLine} We reran their steps on a fresh copy of {repo} at <span className="font-mono">{sha7(milestone.pinnedSha)}</span>
          {status.finishedAt ? ` on ${clock(status.finishedAt)}` : ""}.{" "}
          {missing > 0
            ? "Each failing step and the line it stopped on are below. Your reviewer is waiting on these."
            : unsure > 0
              ? "Nothing failed, but the sentences marked Not sure had no check that ran. Check them yourself."
              : "Send your reviewer the run record so they can see it for themselves."}
        </>
      );
      side = (
        <dl className="flex shrink-0 flex-wrap gap-x-6 gap-y-2 md:flex-col md:gap-1.5">
          <TallyRow verdict="missing" count={missing} />
          <TallyRow verdict="works" count={works} />
          <TallyRow verdict="unsure" count={unsure} />
        </dl>
      );
      break;
    }
    case "running":
      title = `Running step ${status.current} of ${status.total}`;
      body = (
        <>
          {rows[status.current - 1] ? <>Now: &ldquo;{rows[status.current - 1]!.name}&rdquo;. </> : null}
          {status.startedAt ? (
            <>
              The run started <Elapsed from={status.startedAt.toISOString()} /> ago on a fresh copy of {repo}.{" "}
            </>
          ) : null}
          This page updates by itself.
        </>
      );
      break;
    case "queued":
      title = "Waiting for a runner";
      body = <>{plural(status.total, "step is", "steps are")} lined up for {repo} at {sha7(milestone.pinnedSha)}. They start in order. This page updates by itself.</>;
      break;
    case "error":
      title = "The run couldn't start, so nothing was judged";
      body = (
        <>
          {status.checkoutFailed ? `The commit ${sha7(milestone.pinnedSha)} couldn't be checked out from ${repo}. Check that the repo is public and the commit exists.` : "The runner hit an error before your reviewer's steps ran."}
          <span className="mt-3 block rounded-control bg-surface-muted px-3 py-2 font-mono text-small wrap-anywhere text-ink">{status.reason}</span>
        </>
      );
      break;
    case "no-checks":
      tone = "unsure";
      title = "Nothing has been checked yet";
      body = <>{askedLine} There are no steps to run, so every sentence is Not sure.</>;
      break;
  }

  return (
    <section aria-label="Where your payment stands" className={`flex flex-col gap-5 rounded-panel border-2 px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-10 ${STRIP[tone]}`}>
      <div className="min-w-0 max-w-(--container-reading)">
        <h1 className="text-h2 font-semibold text-balance">{title}</h1>
        <p className="mt-1.5 text-body text-ink-secondary">{body}</p>
      </div>
      {side}
    </section>
  );
}

function TallyRow({ verdict, count }: { verdict: "missing" | "works" | "unsure"; count: number }) {
  return (
    <div className="flex flex-row-reverse items-center justify-end gap-2.5">
      <dt>
        <PunchTag verdict={verdict} />
      </dt>
      <dd className="m-0 w-5 text-h2 font-semibold tabular-nums md:text-right">{count}</dd>
    </div>
  );
}

function LiveSteps({ rows, startedAt }: { rows: StepRow[]; startedAt: Date | null }) {
  return (
    <ol aria-label="Steps" className="overflow-hidden rounded-panel border border-ink bg-surface">
      {rows.map((row) => (
        <li key={row.n} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-4 py-3 first:border-t-0 ${row.state === "running" ? "bg-open-soft" : ""}`}>
          <p className="flex min-w-0 items-baseline gap-3">
            <span className="w-4 shrink-0 text-small text-ink-muted tabular-nums">{row.n}</span>
            <span className={`min-w-0 wrap-anywhere ${row.state === "waiting" ? "text-ink-secondary" : "font-medium"}`}>{row.name}</span>
          </p>
          <span className="flex items-center gap-3 text-small text-ink-secondary">
            {row.result ? <span>{duration(row.result.durationMs)}</span> : null}
            {row.state === "running" && startedAt ? (
              <span>
                run time <Elapsed from={startedAt.toISOString()} />
              </span>
            ) : null}
            <StepTag row={row} />
          </span>
        </li>
      ))}
    </ol>
  );
}

const SEVERITY: Record<AskView["severity"], string> = {
  blocks_payment: "Blocks payment",
  nit: "Reviewer nit",
  unclear: "Not clear if it blocks payment",
};

function AskRow({ n, ask, rows, runId }: { n: number; ask: AskView; rows: StepRow[]; runId: string | undefined }) {
  const verdict = tagFor(ask.verdict);
  const failing = ask.failure ? rows.find((r) => r.n === ask.failure!.step) : undefined;
  return (
    <li className="border-t border-border px-4 py-5 first:border-t-0 sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <p className="flex items-center gap-2 text-small text-ink-muted">
          <span className="ask-pin" data-verdict={verdict} aria-label={`Ask ${n}:`}>
            {n}
          </span>
          {SEVERITY[ask.severity]}
        </p>
        <PunchTag verdict={verdict} />
      </div>
      <p className="mt-2 line-clamp-5 font-quote text-quote leading-snug text-ink wrap-anywhere">
        <mark className="ask-mark" data-verdict={verdict}>
          <QuoteText text={ask.quote} />
        </mark>
      </p>
      <div className="mt-4 space-y-3">
        {ask.verdict === "missing" && ask.failure && (
          <>
            <p className="text-small text-ink-secondary">
              Step {ask.failure.step}, &ldquo;{ask.failure.name}&rdquo;, {ask.failure.timedOut ? "ran out of time" : <>exited {ask.failure.exitCode}</>}
              {failing?.result ? ` after ${duration(failing.result.durationMs)}` : ""}
              {failing ? `, network ${failing.network === "none" ? "off" : "on"}` : ""}. It stopped on:
            </p>
            <LogPanel output={ask.failure.line ?? "The step printed nothing."} highlight={ask.failure.line} label={`Failing line from step ${ask.failure.step}`} />
          </>
        )}
        {ask.verdict === "done" && (
          <p className="text-small text-ink-secondary">
            {rows.length === 1 ? `Step ${rows[0]!.n}, “${rows[0]!.name}”, exited 0.` : `All ${rows.length} of its steps exited 0.`} It works on the reviewed commit.
          </p>
        )}
        {ask.verdict === "unsure" && (
          <p className="text-small text-ink-secondary">
            {rows.length === 0 ? "No step checks this sentence, so it wasn't tested. Check it yourself before you reply." : "Its step never ran, so there's no result for it. It isn't counted as passed or failed."}
          </p>
        )}
        {ask.verdict === "open" && <p className="text-small text-ink-secondary">{openLine(rows)}</p>}
        {runId && rows.length > 0 && ask.verdict !== "open" && (
          <Link className="inline-flex min-h-11 items-center text-small font-medium underline underline-offset-4" href={`/runs/${runId}#step-${failing?.n ?? rows[0]!.n}`}>
            See step {failing?.n ?? rows[0]!.n} in the run record
          </Link>
        )}
      </div>
    </li>
  );
}

function openLine(rows: StepRow[]): string {
  if (rows.length === 0) return "No step checks this sentence, so it will be marked Not sure.";
  const running = rows.find((r) => r.state === "running");
  if (running) return `Step ${running.n} is checking this now.`;
  const next = rows.find((r) => r.state === "waiting");
  const done = rows.filter((r) => r.result).length;
  if (next) return done > 0 ? `${plural(done, "step", "steps")} done, waiting on step ${next.n}.` : `Waiting on step ${next.n}.`;
  return "Its steps are done. The verdict appears when the whole run finishes.";
}

function LooseRow({ row, runId }: { row: StepRow; runId: string }) {
  return (
    <li className="border-t border-border first:border-t-0">
      <Link href={`/runs/${runId}#step-${row.n}`} className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 hover:bg-surface-muted sm:px-5">
        <span className="flex min-w-0 items-baseline gap-3">
          <span className="w-4 shrink-0 text-small text-ink-muted tabular-nums">{row.n}</span>
          <span className="min-w-0 font-medium wrap-anywhere">{row.name}</span>
        </span>
        <StepTag row={row} />
      </Link>
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-panel border border-dashed border-border-strong px-4 py-4 text-body text-ink-secondary">{children}</p>;
}


function NextParts({ view, parts, rows }: { view: MilestoneView; parts: PartLink[]; rows: StepRow[] }) {
  const { milestone, asks } = view;
  const [, , fix, check, send] = parts as [PartLink, PartLink, PartLink, PartLink, PartLink];
  const missing = asks.filter((a) => a.verdict === "missing").length;
  const failing = rows.filter((r) => r.state === "failed" || r.state === "timed-out").length;
  const patch = latestPatch(view);
  const ready = sendReadiness(view);
  const repo = repoName(milestone.codeRepoUrl);

  return (
    <>
      <Part n={3} title="Get it fixed" state={fix.state} status={fix.status}>
        {fix.state === "skipped" ? (
          <Empty>Nothing is still missing, so there&apos;s nothing to fix or pay for.</Empty>
        ) : (
          <NextCard
            body={
              fix.state === "later" ? (
                <>Once the run shows what&apos;s missing, you can hire an agent on NEAR Agent Market to fix it.</>
              ) : patch ? (
                <>A change came back from the agent. It goes through part 4 before anything reaches {repo}.</>
              ) : (
                <>
                  Hire an agent on NEAR Agent Market. It gets the {plural(missing || asks.length, "sentence", "sentences")} still missing
                  {failing > 0 ? ` and the failing ${failing === 1 ? "line" : "lines"}` : ""}, reads {repo} at <span className="font-mono">{sha7(milestone.pinnedSha)}</span>, and sends a change back
                  here first. You see its listed price before you agree.
                </>
              )
            }
            action={fix.state === "later" ? null : { href: fix.href, label: patch ? "See the agent's job" : "Choose an agent", primary: !patch }}
          />
        )}
      </Part>

      <Part n={4} title="Check the fix" state={check.state} status={check.status}>
        {check.state === "skipped" ? (
          <Empty>There&apos;s no fix to check. The reviewed commit already passes.</Empty>
        ) : (
          <NextCard
            body={
              patch ? (
                <>
                  Your reviewer&apos;s {plural(rows.length, "step", "steps")} ran again with the fix applied. {check.status === "Passes" ? "Every one passes." : check.status === "Still failing" ? "At least one still fails." : "Results appear as each step finishes."}
                </>
              ) : (
                <>The same {plural(rows.length, "step", "steps")} run again on the fix, in the same image, with the network off. A sentence turns Fixed only when its step exits 0.</>
              )
            }
            action={{ href: check.href, label: patch ? "Open the check" : "See what gets checked", primary: check.state === "current" }}
          />
        )}
      </Part>

      <Part n={5} title={ready.kind === "ready" && ready.source === "base" ? "Tell your reviewer" : "Send it to your reviewer"} state={send.state} status={send.status}>
        <NextCard
          body={
            ready.kind === "ready" ? (
              <>A reply draft is ready, quoting each sentence {milestone.reviewerLogin ?? "your reviewer"} wrote and linking the step that passes. You post it yourself.</>
            ) : (
              <>A pull request and a reply for the {programOf(milestone.threadRepo)} thread, each sentence linked to its passing step. It opens once a run shows nothing still missing.</>
            )
          }
          action={{ href: send.href, label: ready.kind === "ready" ? "Open the reply draft" : "See what unlocks it", primary: ready.kind === "ready" }}
        />
      </Part>
    </>
  );
}

function NextCard({ body, action }: { body: ReactNode; action: { href: string; label: string; primary: boolean } | null }) {
  return (
    <div className="flex flex-col gap-4 rounded-panel border border-border bg-surface px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-(--container-reading) text-body text-ink-secondary">{body}</p>
      {action && (
        <ButtonLink href={action.href} variant={action.primary ? "primary" : "secondary"} className="shrink-0 self-start sm:self-center">
          {action.label}
        </ButtonLink>
      )}
    </div>
  );
}
