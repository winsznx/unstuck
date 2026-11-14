import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { ButtonLink } from "@/components/button";
import { AskCompare } from "@/components/fix/ask-compare";
import { DiffView } from "@/components/fix/diff-view";
import { PartPage, ResultStrip, type StripTone } from "@/components/fix/page-frame";
import { StepTag } from "@/components/run/step-tag";
import { compareAsks, latestPatch, type AskChange } from "@/lib/fix";
import { clock, duration, plural, repoName, sha7 } from "@/lib/format";
import { milestoneView } from "@/lib/queries";
import { milestoneStatus, stepRows } from "@/lib/status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Check the fix" };

export default async function CheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await milestoneView(id);
  if (!view) notFound();
  const { milestone, base } = view;
  const status = milestoneStatus(view);
  const patch = latestPatch(view);
  const changes = compareAsks(view, patch);
  const steps = base?.replay.steps.length ?? 0;
  const live = patch?.replay.status === "queued" || patch?.replay.status === "running";

  if (status.kind === "finished" && status.tally.missing === 0 && !patch) {
    return (
      <PartPage title="Check the fix" lead="There's no fix to check. Every check already passes on the commit your reviewer saw.">
        <ButtonLink href={`/m/${id}/send`}>Tell your reviewer</ButtonLink>
      </PartPage>
    );
  }

  return (
    <PartPage
      title="Check the fix"
      lead={
        <>
          The same {plural(steps, "step", "steps")} your reviewer gave run again on a fresh copy of {repoName(milestone.codeRepoUrl)} at{" "}
        <span className="font-mono">{sha7(milestone.pinnedSha)}</span> with the agent&apos;s change applied, in the same image, with the same network settings. A sentence turns Fixed only
        when its step exits 0.
        </>
      }
    >
      {live && <AutoRefresh />}

      <div aria-live="polite" className="mb-8">
        <Verdict changes={changes} patchStatus={patch?.replay.status ?? null} patchError={patch?.replay.error ?? null} finishedAt={patch?.replay.finishedAt ?? null} id={id} />
      </div>

      {live && patch && (
        <section aria-labelledby="live-title" className="mb-10">
          <h2 id="live-title" className="text-h2 font-semibold">
            Running on the fix
          </h2>
          <ol className="mt-4 overflow-hidden rounded-panel border border-ink bg-surface">
            {stepRows(patch.replay, patch.results).map((row) => (
              <li key={row.n} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-4 py-3 first:border-t-0 ${row.state === "running" ? "bg-open-soft" : ""}`}>
                <span className="flex min-w-0 items-baseline gap-3">
                  <span className="w-4 shrink-0 text-small text-ink-muted tabular-nums">{row.n}</span>
                  <span className="min-w-0 font-medium wrap-anywhere">{row.name}</span>
                </span>
                <span className="flex items-center gap-3 text-small text-ink-secondary">
                  {row.result && <span>{duration(row.result.durationMs)}</span>}
                  <StepTag row={row} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="compare-title">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="compare-title" className="text-h2 font-semibold">
            Before and after, ask by ask
          </h2>
          {patch && (
            <Link className="text-small font-medium underline underline-offset-4" href={`/runs/${patch.replay.id}`}>
              Run record for the fix
            </Link>
          )}
        </div>
        <div className="mt-4">
          <AskCompare changes={changes} baseSha={milestone.pinnedSha} baseRunId={base?.replay.id ?? null} patchRunId={patch?.replay.id ?? null} pendingLabel={patch ? "Checking" : "Waiting for a fix"} />
        </div>
      </section>

      <section aria-labelledby="diff-title" className="mt-12">
        <h2 id="diff-title" className="text-h2 font-semibold">
          The change
        </h2>
        <p className="mt-1 max-w-(--container-reading) text-body text-ink-secondary">
          {patch?.replay.patch ? "Exactly what the agent sent, applied on top of the reviewed commit. This is what the pull request will contain." : "The agent's patch shows up here, file by file, once it's delivered."}
        </p>
        <div className="mt-4">
          {patch?.replay.patch ? (
            <DiffView patch={patch.replay.patch} />
          ) : (
            <p className="rounded-panel border border-dashed border-border-strong px-4 py-6 text-center text-body text-ink-secondary">
              No change yet.{" "}
              <Link className="font-medium text-ink underline underline-offset-4" href={`/m/${id}/fix`}>
                Choose an agent to fix it
              </Link>
            </p>
          )}
        </div>
      </section>
    </PartPage>
  );
}

function Verdict({
  changes,
  patchStatus,
  patchError,
  finishedAt,
  id,
}: {
  changes: AskChange[];
  patchStatus: "queued" | "running" | "finished" | "error" | null;
  patchError: string | null;
  finishedAt: Date | null;
  id: string;
}) {
  const fixed = changes.filter((c) => c.change === "fixed").length;
  const still = changes.filter((c) => c.change === "still-missing").length;
  const broke = changes.filter((c) => c.change === "broke").length;
  const missingBefore = changes.filter((c) => c.before.verdict === "missing").length;

  let tone: StripTone = "plain";
  let title: string;
  let body: ReactNode;
  let action: ReactNode = null;

  if (!patchStatus) {
    tone = "unsure";
    title = "Waiting for a fix";
    body = <>{plural(missingBefore, "sentence is", "sentences are")} still missing on the reviewed commit. Once an agent delivers a change, it runs here automatically.</>;
    action = <ButtonLink href={`/m/${id}/fix`}>Choose an agent</ButtonLink>;
  } else if (patchStatus === "queued" || patchStatus === "running") {
    title = patchStatus === "queued" ? "The fix is waiting for a runner" : "Checking the fix now";
    body = <>Results appear below as each step finishes. This page updates by itself.</>;
  } else if (patchStatus === "error") {
    tone = "unsure";
    title = "The fix couldn't be checked";
    body = (
      <>
        The runner stopped before your reviewer&apos;s steps ran, so nothing was judged and nothing is marked Fixed.
        {patchError && <span className="mt-3 block rounded-control bg-surface-muted px-3 py-2 font-mono text-small wrap-anywhere text-ink">{patchError}</span>}
      </>
    );
  } else if (still + broke === 0) {
    tone = "pass";
    title = fixed === 1 ? "The fix closes the one thing your reviewer asked for" : `The fix closes all ${fixed} things your reviewer asked for`;
    body = <>Every step exits 0 on the fix{finishedAt ? `, checked ${clock(finishedAt)}` : ""}. The pull request and your reply are ready.</>;
    action = <ButtonLink href={`/m/${id}/send`}>Review and send</ButtonLink>;
  } else {
    tone = "fail";
    title = broke > 0 ? `The fix breaks ${plural(broke, "thing that worked", "things that worked")}` : `${still} of ${missingBefore} still missing on the fix`;
    body = (
      <>
        {fixed > 0 ? `${plural(fixed, "sentence is", "sentences are")} fixed. ` : ""}The new failing {still + broke === 1 ? "line is" : "lines are"} below. Nothing is sent to your reviewer until every step passes.
      </>
    );
    action = (
      <ButtonLink href={`/m/${id}/fix`} variant="secondary">
        Back to the fix
      </ButtonLink>
    );
  }

  return <ResultStrip label="Result of the fix" tone={tone} title={title} body={body} action={action} />;
}
