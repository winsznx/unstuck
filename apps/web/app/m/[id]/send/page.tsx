import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/button";
import { DiffView } from "@/components/fix/diff-view";
import { DraftEditor } from "@/components/fix/draft-editor";
import { GateList } from "@/components/fix/gate-list";
import { Blocked, PartPage, ResultStrip } from "@/components/fix/page-frame";
import { parsePatch, prDraft, replyDraft, sendReadiness, type DraftInput, type SendReadiness } from "@/lib/fix";
import { plural, repoName, sha7 } from "@/lib/format";
import { programOf } from "@/lib/programs";
import { milestoneView, type MilestoneView } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Send it to your reviewer" };

const LOCKED: Record<Extract<SendReadiness, { kind: "locked" }>["reason"], { title: string; body: string; next: (id: string) => { href: string; label: string } }> = {
  "no-asks": {
    title: "No sentence was picked from the review",
    body: "The reply quotes your reviewer's own words next to the step that passes. Without a picked sentence there's nothing to quote.",
    next: () => ({ href: "/start", label: "Pick the asks" }),
  },
  "no-run": {
    title: "Your reviewer's steps haven't finished running",
    body: "Nothing goes to your reviewer before a finished run shows where each sentence stands.",
    next: (id) => ({ href: `/m/${id}`, label: "Back to the run" }),
  },
  "no-fix": {
    title: "Something is still missing on the reviewed commit",
    body: "A reply now would tell your reviewer it's done when their own steps still fail. Get it fixed first, then this page fills in.",
    next: (id) => ({ href: `/m/${id}/fix`, label: "Choose an agent" }),
  },
  checking: {
    title: "The fix is being checked",
    body: "The drafts appear when every step passes on the fix.",
    next: (id) => ({ href: `/m/${id}/check`, label: "Watch the check" }),
  },
  "check-error": {
    title: "The fix couldn't be checked",
    body: "The runner stopped before the steps ran, so nothing can be claimed yet.",
    next: (id) => ({ href: `/m/${id}/check`, label: "See what happened" }),
  },
  "fix-fails": {
    title: "The fix still fails a check",
    body: "UNSTUCK only drafts a reply when every step your reviewer gave exits 0 on the fix.",
    next: (id) => ({ href: `/m/${id}/check`, label: "See the failing line" }),
  },
};

export default async function SendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await milestoneView(id);
  if (!view) notFound();
  const { milestone } = view;
  const program = programOf(milestone.threadRepo);
  const ready = sendReadiness(view);
  const reviewer = milestone.reviewerLogin ?? "your reviewer";

  if (ready.kind === "locked") {
    const copy = LOCKED[ready.reason];
    const next = copy.next(id);
    return (
      <PartPage
        title="Send it to your reviewer"
        lead={
          <>
            A pull request for {repoName(milestone.codeRepoUrl)} and a reply for the {program} thread, with each sentence {reviewer} wrote linked to the step that passes. You post both yourself.
          </>
        }
      >
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <Blocked title={copy.title} body={copy.body} action={<ButtonLink href={next.href}>{next.label}</ButtonLink>} />
          <section aria-labelledby="gates-title" className="rounded-panel border border-border bg-surface px-5 py-5">
            <h2 id="gates-title" className="text-h3 font-semibold">
              This opens when
            </h2>
            <div className="mt-3">
              <GateList gates={ready.gates} label="What has to happen first" />
            </div>
          </section>
        </div>
      </PartPage>
    );
  }

  const origin = await publicOrigin();
  const draft = draftInput(view, ready, origin, program);
  const reply = replyDraft(draft);
  const pr = ready.source === "patch" ? prDraft(draft) : null;
  const files = ready.source === "patch" && ready.run.replay.patch ? parsePatch(ready.run.replay.patch) : [];
  const threadLink = milestone.reviewerCommentUrl ?? milestone.threadUrl;

  return (
    <PartPage
      title={ready.source === "patch" ? "Send it to your reviewer" : "Tell your reviewer"}
      lead={
        ready.source === "patch" ? (
          <>The fix passes every step {reviewer} gave. Open the pull request, then post the reply. Edit anything you like first. UNSTUCK never posts for you.</>
        ) : (
          <>Every check passes on the commit {reviewer} reviewed. Post the reply with the run record so they can see it for themselves. UNSTUCK never posts for you.</>
        )
      }
    >
      <ResultStrip
        label="Ready to send"
        tone={ready.untested.length > 0 ? "unsure" : "pass"}
        title={
          ready.untested.length > 0
            ? `${plural(ready.changes.length - ready.untested.length, "sentence passes", "sentences pass")}, ${ready.untested.length} not tested`
            : ready.changes.length === 1
              ? "The one thing your reviewer asked for passes"
              : `All ${ready.changes.length} things your reviewer asked for pass`
        }
        body={
          <>
            Checked on {ready.source === "patch" ? "the fix" : <span className="font-mono">{sha7(milestone.pinnedSha)}</span>}.{" "}
            {ready.untested.length > 0 ? "The reply says plainly which ones had no check, so it doesn't claim more than the run shows." : "Each line of the reply links to the exact step."}
          </>
        }
        action={
          <ButtonLink href={`/runs/${ready.run.replay.id}`} variant="secondary">
            Open the run record
          </ButtonLink>
        }
      />

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
        {pr && (
          <section aria-labelledby="pr-title" className="min-w-0 space-y-4">
            <Step n={1} id="pr-title" title="Open the pull request">
              From a fork of {repoName(milestone.codeRepoUrl)}, on a branch from <span className="font-mono">{sha7(milestone.pinnedSha)}</span>. You merge it, or not.
            </Step>
            <DraftEditor label="Title" initial={pr.title} rows={2} />
            <DraftEditor label="Description" initial={pr.body} rows={14} mono hint="Markdown. The table renders on GitHub." />
            {files.length > 0 && (
              <details className="group">
                <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-small font-medium underline underline-offset-4 [&::-webkit-details-marker]:hidden">
                  {plural(files.length, "file", "files")} in the change
                </summary>
                <div className="mt-3">
                  <DiffView patch={ready.run.replay.patch ?? ""} openFirst={1} />
                </div>
              </details>
            )}
          </section>
        )}

        <section aria-labelledby="reply-title" className={`min-w-0 space-y-4 ${pr ? "" : "lg:col-span-2 lg:max-w-3xl"}`}>
          <Step n={pr ? 2 : 1} id="reply-title" title={`Reply on the ${program} thread`}>
            It quotes each sentence word for word, so {reviewer} can match it to their review.
            {pr ? " Add the pull request link where it says so." : ""}
          </Step>
          <DraftEditor label="Reply" initial={reply} rows={16} hint="Markdown, ready for a GitHub comment." />
          <ButtonLink href={threadLink} variant="secondary">
            Open the thread on GitHub
          </ButtonLink>
        </section>
      </div>

      <p className="mt-12 max-w-(--container-reading) text-small text-ink-secondary">
        Your reviewer still decides. UNSTUCK can&apos;t make a funder pay, and it doesn&apos;t post, comment or open pull requests on your behalf.{" "}
        <Link className="font-medium text-ink underline underline-offset-4" href={`/m/${id}`}>
          Back to the milestone
        </Link>
      </p>
    </PartPage>
  );
}

function Step({ n, id, title, children }: { n: number; id: string; title: string; children: React.ReactNode }) {
  return (
    <header>
      <h2 id={id} className="flex items-baseline gap-3 text-h2 font-semibold">
        <span className="text-small font-semibold text-ink-muted tabular-nums">{n}</span>
        {title}
      </h2>
      <p className="mt-1 text-body text-ink-secondary">{children}</p>
    </header>
  );
}

function draftInput(view: MilestoneView, ready: Extract<SendReadiness, { kind: "ready" }>, origin: string, program: string): DraftInput {
  const { milestone, base } = view;
  const checksFor: DraftInput["checksFor"] = {};
  ready.run.replay.steps.forEach((step, i) => {
    if (!step.askId) return;
    (checksFor[step.askId] ??= []).push({ n: i + 1, command: step.command, offline: step.network === "none" });
  });
  return {
    reviewer: milestone.reviewerLogin,
    threadUrl: milestone.reviewerCommentUrl ?? milestone.threadUrl,
    repo: repoName(milestone.codeRepoUrl),
    sha: milestone.pinnedSha,
    program,
    changes: ready.changes,
    source: ready.source,
    runUrl: `${origin}/runs/${ready.run.replay.id}`,
    ...(ready.source === "patch" && base ? { baseRunUrl: `${origin}/runs/${base.replay.id}` } : {}),
    checksFor,
  };
}

/** The origin the owner reached this page on, so links in the drafts open for their reviewer too. */
async function publicOrigin(): Promise<string> {
  const configured = process.env.UNSTUCK_PUBLIC_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
