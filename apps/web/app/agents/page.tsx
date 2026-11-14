import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/button";
import { CodeBlock } from "@/components/agents/code-block";
import { SiteFooter, SiteHeader } from "@/components/site";
import { PageHead, SectionHead } from "@/components/study/page-head";
import { checkReport } from "@/lib/check-report";
import { repoName, sha7 } from "@/lib/format";
import { showcase } from "@/lib/queries";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "For agents",
  description: "How another agent calls UNSTUCK through its MCP server: a reviewer's comment in, asks with rerun verdicts, run records, a fix brief and fix checks out.",
  path: "/agents",
});

const INPUT: { field: string; required: boolean; body: string }[] = [
  { field: "thread", required: true, body: "A public GitHub issue or pull request URL. A link to one comment picks that comment." },
  { field: "repo", required: false, body: "The code repo's GitHub address, when the thread links several repos or none." },
  { field: "asks", required: false, body: "The reviewer's sentences that count as asks, copied exactly. Any sentence not in the comment word for word is refused. Leave it out and NEAR AI picks them." },
  { field: "checks", required: false, body: "Shell commands run offline at the reviewed commit, each tied to an ask by its number. An ask with no command gets one suggested from the repo." },
  { field: "image", required: false, body: "The container image for the checks. Defaults to one picked from the repo's own files." },
];

const OUTPUT: { field: string; body: string }[] = [
  { field: "status", body: "still_missing, works, not_sure, running, could_not_run or no_checks. A run that couldn't start is never a verdict." },
  { field: "asks[]", body: "Each ask's exact quote, its severity and verdict, and for a failing one the step, exit code and the line it stopped on." },
  { field: "asks[].failure.record", body: "A link straight to that step in the public run record." },
  { field: "code", body: "The repo and the full commit that was rerun: the one the reviewer saw, not today's main." },
  { field: "runRecord", body: "The run record: every command, network setting, exit code, duration and output hash." },
  { field: "brief", body: "Plain text a fixing agent can start from: what's open, where it fails, and the bar a fix has to clear." },
];

const PROMISES: { title: string; body: string }[] = [
  { title: "It reads, it doesn't write", body: "No comments, no pushes, no pull requests from the check itself. What gets posted stays your caller's decision." },
  { title: "Quotes stay quotes", body: "Asks are the reviewer's exact sentences with their position in the comment. Nothing is summarized into a different claim." },
  { title: "No verdict without a run", body: "Every still_missing and works points at an exit code in a stored run anyone can open." },
  { title: "Public code only", body: "If the repo isn't public, the check refuses instead of asking for a token." },
];

async function originOf(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function AgentsPage() {
  const [origin, cases] = await Promise.all([originOf(), showcase()]);
  const example = cases.find((c) => c.base?.replay.status === "finished");
  const report = example ? checkReport(example, origin) : null;
  const thread = example?.milestone.reviewerCommentUrl ?? example?.milestone.threadUrl ?? "https://github.com/<org>/<repo>/issues/<n>#issuecomment-<id>";
  const request = JSON.stringify(
    example
      ? {
          thread,
          asks: example.asks.map((a) => a.quote),
          checks:
            example.base?.replay.steps.map((s) => {
              const n = example.asks.findIndex((a) => a.id === s.askId);
              return n === -1 ? { command: s.command } : { ask: n + 1, command: s.command };
            }) ?? [],
        }
      : { thread },
    null,
    2,
  );

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="pb-8">
        <PageHead
          title="Call UNSTUCK from your own agent"
          lead="Hand it a reviewer's comment on a public GitHub thread. It reruns the reviewer's checks at the commit they saw and returns each ask word for word with a verdict, a link to the run record behind it, and a brief a fixing agent can start from."
          aside={<Availability />}
        />

        <section aria-labelledby="example-title" className="mx-auto mt-14 max-w-(--container-content) px-2 sm:px-6">
          <div className="stage rounded-stage p-3 sm:p-6 lg:p-8">
            <div className="px-2 pb-5 sm:px-0">
              <h2 id="example-title" className="text-h2 font-semibold">
                One real check, request and answer
              </h2>
              <p className="mt-1 max-w-[44rem] text-small text-ink-secondary">
                {example ? (
                  <>
                    Built from a stored run on {repoName(example.milestone.codeRepoUrl)} at {sha7(example.milestone.pinnedSha)}.{" "}
                    <Link className="font-medium text-ink underline underline-offset-4" href={`/runs/${example.base?.replay.id}`}>
                      Open its run record
                    </Link>
                  </>
                ) : (
                  "No finished run to show yet. The shape below is what every answer follows."
                )}
              </p>
            </div>
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-6">
              <div className="grid min-w-0 gap-4">
                <CodeBlock title="Request" code={request} />
                {report && (
                  <div className="rounded-sheet border border-border bg-surface p-5 shadow-object">
                    <p className="text-small font-semibold">The brief, as a fixing agent reads it</p>
                    <p className="mt-3 border-l-2 border-fails pl-3 text-small whitespace-pre-line text-ink-secondary">{report.brief}</p>
                  </div>
                )}
              </div>
              <CodeBlock title="Response" code={report ? JSON.stringify(report, null, 2) : SHAPE} maxHeight="max-h-[46rem]" />
            </div>
          </div>
        </section>

        <section aria-labelledby="contract-title" className="mx-auto max-w-(--container-content) px-4 pt-20 sm:px-6 lg:pt-28">
          <SectionHead id="contract-title" title="What goes in, what comes out" lead="One job, the same contract whichever way you call it." />
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FieldTable title="You send" rows={INPUT.map((r) => [r.field, r.body, r.required ? "Required" : "Optional"])} />
            <FieldTable title="You get back" rows={OUTPUT.map((r) => [r.field, r.body, null])} />
          </div>
        </section>

        <section aria-labelledby="ways-title" className="mx-auto max-w-(--container-content) px-4 pt-20 sm:px-6 lg:pt-28">
          <SectionHead id="ways-title" title="Three ways to call it" lead="The MCP server is live. The market listing and the skill aren't open yet." />
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Way title="A job on NEAR Agent Market" state="Not listed yet" body="Post a job to the unstuck seller with the thread link in the brief. The answer above comes back as the delivery, and the run record link is the evidence the buyer accepts against.">
              <CodeBlock title="Job brief" code={`unstuck check ${thread}`} />
            </Way>
            <Way title="An MCP server" state="Live" body={`At ${origin}/mcp, no sign-in. Four tools: unstuck_check, unstuck_status, unstuck_check_fix and unstuck_suggest_asks.`}>
              <CodeBlock title="Claude Code" code={`claude mcp add --transport http unstuck ${origin}/mcp`} maxHeight="max-h-[16rem]" />
            </Way>
            <Way title="A Claude Code skill" state="Not built yet" body="It would run from the terminal on a thread you're working on and print the asks, their verdicts and the brief.">
              <CodeBlock title="Terminal" code={`$ unstuck check ${thread}`} />
            </Way>
          </div>
        </section>

        <section aria-labelledby="terms-title" className="mx-auto max-w-(--container-content) px-4 pt-20 sm:px-6 lg:pt-28">
          <div className="grid grid-cols-1 overflow-hidden rounded-sheet border border-border bg-surface md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="p-6 sm:p-10">
              <h2 id="terms-title" className="text-section font-semibold text-balance">
                Price
              </h2>
              <p className="mt-4 text-lead text-ink-secondary">The MCP server is free. The market listing isn&apos;t open yet. When it opens, its price is set on NEAR Agent Market and shown there before any job is posted.</p>
              <p className="mt-4 text-body text-ink-secondary">Grantees using UNSTUCK directly read and rerun for free.</p>
              <ButtonLink href="/start" variant="secondary" className="mt-8">
                Try it on a thread yourself
              </ButtonLink>
            </div>
            <div className="border-t border-border bg-surface-muted p-6 sm:p-10 md:border-t-0 md:border-l">
              <h3 className="text-h2 font-semibold">What every answer holds to</h3>
              <ul className="mt-6 divide-y divide-border">
                {PROMISES.map((p) => (
                  <li key={p.title} className="py-4 first:pt-0 last:pb-0">
                    <p className="text-body font-semibold">{p.title}</p>
                    <p className="mt-1 text-small text-ink-secondary">{p.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

const SHAPE = JSON.stringify(
  {
    status: "still_missing",
    asks: [{ n: 1, quote: "<the reviewer's sentence>", verdict: "still_missing", failure: { step: 1, exitCode: 1, line: "<where it stopped>", record: "<run record>#step-1" } }],
    runRecord: "<run record>",
    brief: "<what's open and the bar a fix has to clear>",
  },
  null,
  2,
);

function Availability() {
  const rows: [string, string][] = [
    ["NEAR Agent Market listing", "Not listed yet"],
    ["MCP server", "Live at /mcp"],
    ["Claude Code skill", "Not built yet"],
    ["The check itself", "Live on this site"],
  ];
  return (
    <dl className="rounded-panel border border-border bg-surface px-4 py-1 text-small shadow-object">
      {rows.map(([what, state]) => (
        <div key={what} className="flex items-baseline justify-between gap-6 border-border py-2.5 not-last:border-b">
          <dt className="text-ink-secondary">{what}</dt>
          <dd className={`shrink-0 font-semibold ${state.startsWith("Live") ? "text-ink" : "text-ink-muted"}`}>{state}</dd>
        </div>
      ))}
    </dl>
  );
}

function FieldTable({ title, rows }: { title: string; rows: [string, string, string | null][] }) {
  return (
    <div className="rounded-sheet border border-border bg-surface">
      <h3 className="border-b border-border px-5 py-4 text-h3 font-semibold sm:px-6">{title}</h3>
      <dl className="divide-y divide-border">
        {rows.map(([field, body, badge]) => (
          <div key={field} className="grid grid-cols-1 gap-1.5 px-5 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6 sm:px-6">
            <dt className="flex flex-wrap items-baseline gap-x-2">
              <code className="font-mono log-type font-semibold wrap-anywhere">{field}</code>
              {badge && <span className="text-tag text-ink-muted">{badge}</span>}
            </dt>
            <dd className="text-small text-ink-secondary">{body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Way({ title, state, body, children }: { title: string; state: string; body: string; children: ReactNode }) {
  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-sheet border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-h3 font-semibold">{title}</h3>
        <span className="rounded-tag border border-dashed border-border-control px-2 py-0.5 text-tag font-semibold text-ink-secondary">{state}</span>
      </div>
      <p className="text-small text-ink-secondary">{body}</p>
      {children}
    </article>
  );
}
