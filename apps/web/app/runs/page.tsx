import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/button";
import { SiteFooter, SiteHeader } from "@/components/site";
import { PageHead } from "@/components/study/page-head";
import { PunchTag, type TagVerdict } from "@/components/tag";
import { clock, duration, plural, repoName, sha7 } from "@/lib/format";
import { runIndex, type RunRow } from "@/lib/study";
import { loadStudyInput } from "@/lib/study-data";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Recorded runs",
  description: "Every rerun of a reviewer's steps, with its commit, exit codes and a public record anyone can check.",
  path: "/runs",
});

function outcome(run: RunRow): { verdict: TagVerdict; label: string } {
  switch (run.status) {
    case "queued":
      return { verdict: "open", label: "Waiting" };
    case "running":
      return { verdict: "open", label: "Running" };
    case "error":
      return { verdict: "unsure", label: "Couldn't start" };
    case "finished":
      if (run.checks === 0) return { verdict: "unsure", label: "No checks" };
      if (run.failed > 0) return { verdict: "missing", label: `${run.failed} of ${run.checks} failed` };
      if (run.notRun > 0) return { verdict: "unsure", label: `${run.notRun} of ${run.checks} didn't run` };
      return { verdict: "works", label: run.checks === 1 ? "Passed" : `All ${run.checks} passed` };
  }
}

export default async function RunsPage() {
  const runs = runIndex(await loadStudyInput());
  const finished = runs.filter((r) => r.status === "finished").length;

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="pb-8">
        <PageHead
          title="Recorded runs"
          lead="Every time a reviewer's steps were rerun, newest first. Each record shows the commit, every command, whether the network was on, the exit codes and a hash of the output."
          aside={
            <p className="text-small text-ink-secondary">
              <span className="block text-h2 font-semibold text-ink tabular-nums">{plural(runs.length, "run", "runs")}</span>
              {finished} finished. <Link className="underline underline-offset-4 hover:text-ink" href="/study">What they add up to</Link>
            </p>
          }
        />

        <section aria-label="Runs" className="mx-auto mt-12 max-w-(--container-content) px-4 sm:px-6">
          {runs.length === 0 ? (
            <div className="rounded-sheet border border-dashed border-border-strong bg-surface p-8 text-center">
              <p className="text-h3 font-semibold">No runs recorded yet</p>
              <p className="mt-2 text-body text-ink-secondary">Start a milestone and its first rerun is recorded here.</p>
              <ButtonLink href="/start" className="mt-5">
                Start a milestone
              </ButtonLink>
            </div>
          ) : (
            <div className="overflow-hidden rounded-sheet border border-border bg-surface">
              <div aria-hidden className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_7rem] gap-6 border-b border-border px-6 py-3 text-small text-ink-muted lg:grid">
                <span>Code and review</span>
                <span>Result</span>
                <span>Started</span>
                <span className="text-right">Took</span>
              </div>
              <ol>
                {runs.map((run) => (
                  <RunItem key={run.id} run={run} />
                ))}
              </ol>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function RunItem({ run }: { run: RunRow }) {
  const { verdict, label } = outcome(run);
  return (
    <li className="border-border not-first:border-t">
      <Link
        href={`/runs/${run.id}`}
        className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors duration-(--duration-fast) hover:bg-surface-muted sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_7rem] lg:items-center lg:gap-6"
      >
        <span className="min-w-0">
          <span className="flex min-w-0 items-baseline gap-2 font-mono log-type">
            <span className="shrink-0 font-semibold">{sha7(run.sha)}</span>
            <span className="min-w-0 truncate text-ink-secondary">{repoName(run.codeRepoUrl)}</span>
          </span>
          <span className="mt-1 block truncate text-small text-ink-secondary">
            {run.target === "patch" ? "Fix check, " : ""}
            {run.program}
            {run.threadTitle ? `, ${run.threadTitle}` : ""}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <PunchTag verdict={verdict}>{label}</PunchTag>
          {run.status === "finished" && run.passed > 0 && run.failed > 0 && <span className="text-small text-ink-muted">{run.passed} passed</span>}
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-1 lg:contents">
          <span className="text-small text-ink-secondary">
            <span className="text-ink-muted lg:sr-only">Started </span>
            {clock(run.at)}
          </span>
          <span className="text-small text-ink-secondary lg:text-right">
            <span className="text-ink-muted lg:sr-only">Took </span>
            {run.tookMs === null ? "Not finished" : duration(run.tookMs)}
          </span>
        </span>
      </Link>
    </li>
  );
}
