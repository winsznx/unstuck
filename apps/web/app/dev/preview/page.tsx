import type { Metadata } from "next";
import Link from "next/link";
import { AccessTerms, AccountOverview, ClaimCode, HireList, HireRuler, HireStatusChip, LimitMeter, Notice, SignedOutAccount, Steps } from "@/components/account";
import { CodeBlock } from "@/components/agents/code-block";
import { Button, ButtonLink } from "@/components/button";
import { CommentCard, RichComment, type CommentMark } from "@/components/comment-card";
import { AgentCard } from "@/components/fix/agent-card";
import { AskCompare } from "@/components/fix/ask-compare";
import { DiffView } from "@/components/fix/diff-view";
import { DraftEditor } from "@/components/fix/draft-editor";
import { GateList } from "@/components/fix/gate-list";
import { HireForm } from "@/components/fix/hire-form";
import { JobTracker } from "@/components/fix/job-tracker";
import { MilestoneList } from "@/components/fix/milestone-list";
import { Blocked, ResultStrip } from "@/components/fix/page-frame";
import { MilestoneRail } from "@/components/fix/part-rail";
import { WorkOrder } from "@/components/fix/work-order";
import { Fold } from "@/components/landing/fold";
import { Rail } from "@/components/landing/rail";
import { LogPanel } from "@/components/log-panel";
import { MilestoneComment } from "@/components/milestone-card";
import { StepTag } from "@/components/run/step-tag";
import { RunSlip } from "@/components/run-slip";
import { AccountChip } from "@/components/shell/account-chip";
import { StatePanel } from "@/components/shell/state-panel";
import { Figure, VerdictBar } from "@/components/study/figures";
import { PunchTag, TAG_LABEL, type TagVerdict } from "@/components/tag";
import { checkReport } from "@/lib/check-report";
import type { JobStatus } from "@/lib/fix-shared";
import { SAMPLE_BODY, SAMPLE_MILESTONE, sampleView, type SampleState } from "@/lib/sample";
import { stepRows, type StepState } from "@/lib/status";
import { sampleHire } from "./actions";
import { DeviceFlowStates, LimitDemo } from "./demos";
import { KitExample, KitGrid, KitSection } from "./kit";
import { ACCOUNT, AGENTS, askChanges, HIRES, IDENTITY, LIMITS, NOW, PATCH, SUMMARIES } from "./samples";

export const metadata: Metadata = { title: "Component preview" };

const SECTIONS: [string, string][] = [
  ["type", "Type and buttons"],
  ["tags", "Punch tags and marks"],
  ["comment", "The reviewer's comment"],
  ["logs", "Logs and run slips"],
  ["milestone", "Milestones"],
  ["fix", "Getting a fix"],
  ["send", "Checking and sending"],
  ["account", "Agent Market account"],
  ["limit", "Spending limit"],
  ["study", "Study and agents"],
  ["states", "Page states"],
  ["landing", "Landing patterns"],
];

const VERDICTS = Object.keys(TAG_LABEL) as TagVerdict[];
const STEP_STATES: StepState[] = ["passed", "failed", "timed-out", "running", "waiting", "skipped"];
const JOB_STATUSES: JobStatus[] = ["sent", "accepted", "working", "delivered", "failed", "refunded"];
const MILESTONE_STATES: SampleState[] = ["queued", "running", "missing", "mixed", "works", "error", "no-checks"];

function marks(state: SampleState): CommentMark[] {
  return sampleView(state)
    .asks.filter((a) => a.quoteStart !== null)
    .map((a, i) => ({ n: i + 1, start: a.quoteStart ?? 0, length: a.quote.length, verdict: a.verdict === "done" ? "works" : a.verdict }));
}

export default function PreviewPage() {
  const missing = sampleView("missing");
  const works = sampleView("works");
  const missingResults = missing.base?.results ?? [];

  return (
    <main className="mx-auto max-w-(--container-content) px-4 py-12 sm:px-6">
      <div className="rounded-panel border border-open-edge/40 bg-open-soft px-4 py-3 text-small">
        <PunchTag verdict="open">Sample data</PunchTag>
        <span className="ml-2">Every name, repo and number on this page is made up. It only renders in development.</span>
      </div>
      <h1 className="mt-8 text-display font-semibold">Component preview</h1>
      <p className="mt-4 max-w-[44rem] text-lead text-ink-secondary">
        Every shared piece of the UNSTUCK interface in every state it has, built around one fictional milestone. Colours and their contrast live on the{" "}
        <Link className="underline underline-offset-4" href="/dev/palette">
          palette page
        </Link>
        . Rules for each piece are in docs/DESIGN.md.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
        <nav aria-label="Sections" className="lg:sticky lg:top-24 lg:self-start">
          <ol className="flex flex-wrap gap-2 lg:flex-col lg:gap-0.5">
            {SECTIONS.map(([id, title]) => (
              <li key={id}>
                <a className="inline-flex min-h-9 items-center rounded-control px-2.5 text-small text-ink-secondary hover:bg-surface hover:text-ink max-lg:border max-lg:border-border" href={`#${id}`}>
                  {title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0">
          <KitSection id="type" title="Type and buttons" description="Schibsted Grotesk for the interface, Newsreader only for the reviewer's words, JetBrains Mono only for machine output.">
            <div className="space-y-3 rounded-sheet border border-border bg-surface p-6">
              <p className="text-hero font-semibold">Hero 72</p>
              <p className="text-display font-semibold">Display 68</p>
              <p className="text-section font-semibold">Section 46</p>
              <p className="text-h1 font-semibold">Heading one 34</p>
              <p className="text-h2 font-semibold">Heading two 21</p>
              <p className="text-h3 font-semibold">Heading three 16</p>
              <p className="text-lead text-ink-secondary">Lead paragraph, 19 on 29.</p>
              <p className="text-body">Body text, 15 on 23. The reviewer&apos;s steps rerun at the commit they saw.</p>
              <p className="text-small text-ink-secondary">Small text, 13 on 19.5.</p>
              <p className="font-quote text-comment">The reviewer&apos;s own words, in the quote face.</p>
              <p className="font-mono log-type">exit 1 in 198 ms</p>
            </div>
            <KitGrid>
              <KitExample label="Variants, medium">
                <div className="flex flex-wrap items-center gap-3">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="quiet">Quiet</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </KitExample>
              <KitExample label="Large, and inverse on the log surface">
                <div className="flex flex-wrap items-center gap-3 rounded-panel bg-log p-4">
                  <ButtonLink href="#type" size="lg" variant="inverse">
                    Inverse
                  </ButtonLink>
                  <ButtonLink href="#type" size="lg" variant="secondary">
                    Secondary
                  </ButtonLink>
                </div>
              </KitExample>
            </KitGrid>
          </KitSection>

          <KitSection id="tags" title="Punch tags and marks" description="A red or green tag only appears when a stored run decided it. Open is yellow, Not sure is dashed.">
            <KitGrid>
              <KitExample label="Every verdict">
                <div className="flex flex-wrap gap-3">
                  {VERDICTS.map((v) => (
                    <PunchTag key={v} verdict={v} />
                  ))}
                </div>
              </KitExample>
              <KitExample label="Numbered, and large">
                <div className="flex flex-wrap items-center gap-3">
                  {VERDICTS.map((v, i) => (
                    <PunchTag key={v} verdict={v} n={i + 1} size="lg" />
                  ))}
                </div>
              </KitExample>
              <KitExample label="Step results in a run record">
                <div className="flex flex-wrap gap-3">
                  {STEP_STATES.map((state) => (
                    <StepTag key={state} row={{ state, result: state === "passed" ? (missingResults[0] ?? null) : state === "failed" ? (missingResults[1] ?? null) : null }} />
                  ))}
                </div>
              </KitExample>
              <KitExample label="Highlighted asks in running text">
                <RichComment body={SAMPLE_BODY} marks={marks("mixed")} className="rounded-sheet border border-border bg-surface p-5" />
              </KitExample>
            </KitGrid>
          </KitSection>

          <KitSection id="comment" title="The reviewer's comment" description="GitHub markdown, rendered without changing a character. Marks land on the stored offsets.">
            <KitGrid>
              <KitExample label="Asks still open, numbered list underneath">
                <CommentCard
                  author={SAMPLE_MILESTONE.reviewerLogin ?? "reviewer"}
                  createdAt={SAMPLE_MILESTONE.reviewerCommentAt}
                  url={SAMPLE_MILESTONE.threadUrl}
                  body={SAMPLE_BODY}
                  marks={marks("queued")}
                  source="Example Fund review"
                  list
                />
              </KitExample>
              <KitExample label="Decided, with the failing line under each ask">
                <MilestoneComment view={missing} withNotes />
              </KitExample>
            </KitGrid>
          </KitSection>

          <KitSection id="logs" title="Logs and run slips" description="Machine output only. The line that decided a verdict is marked.">
            <KitGrid>
              <KitExample label="Log with its deciding line">
                <LogPanel
                  output={missingResults[2]?.outputTail ?? ""}
                  highlight="Error: ENOENT: no such file or directory, open 'fixtures/block.json'"
                  label="Output of pnpm test"
                  title={<>$ pnpm test, exit 1</>}
                />
              </KitExample>
              <KitExample label="Run slip, failing">
                <RunSlip repo="example-org/grant-sdk" sha={SAMPLE_MILESTONE.pinnedSha} results={missingResults} href="#logs" />
              </KitExample>
              <KitExample label="Run slip, passing">
                <RunSlip repo="example-org/grant-sdk" sha={SAMPLE_MILESTONE.pinnedSha} results={works.base?.results ?? []} />
              </KitExample>
              <KitExample label="Step rows of a running run">
                <ul className="space-y-2 rounded-sheet border border-border bg-surface p-5 text-small">
                  {(() => {
                    const running = sampleView("running").base;
                    return running
                      ? stepRows(running.replay, running.results).map((row) => (
                          <li key={row.n} className="flex items-center justify-between gap-4">
                            <span className="min-w-0 truncate">{row.name}</span>
                            <StepTag row={row} />
                          </li>
                        ))
                      : null;
                  })()}
                </ul>
              </KitExample>
            </KitGrid>
          </KitSection>

          <KitSection id="milestone" title="Milestones" description="The list a grantee comes back to, grouped by what each milestone needs next, and the five-part rail.">
            <KitExample label="Every group in the milestone list">
              <MilestoneList items={SUMMARIES} />
            </KitExample>
            <KitExample label="Five-part rail, fix in progress">
              <MilestoneRail
                parts={[
                  { n: 1, name: "Read", state: "done", status: "Done", href: "#milestone" },
                  { n: 2, name: "Missing", state: "done", status: "2 still missing", href: "#milestone" },
                  { n: 3, name: "Fix", state: "current", status: "Agent working", href: "#milestone" },
                  { n: 4, name: "Check", state: "later", status: "After a fix", href: "#milestone" },
                  { n: 5, name: "Send", state: "later", status: "After it passes", href: "#milestone" },
                ]}
              />
            </KitExample>
            <KitExample label="Result strips">
              <div className="grid grid-cols-1 gap-4">
                <ResultStrip tone="fail" label="Result" title="Both asks are still missing" body="Rerun at 4b1d9e0 on 6 Nov 2026." />
                <ResultStrip tone="pass" label="Result" title="Every ask works" body="Send the run record to your reviewer." action={<ButtonLink href="#milestone">Open part 5</ButtonLink>} />
                <ResultStrip tone="unsure" label="Result" title="Nothing failed, one ask had no check" body="Add a check to settle it." />
                <ResultStrip tone="plain" label="Status" title="Waiting for a runner" body="2 checks queued." />
              </div>
            </KitExample>
            <KitGrid cols={3}>
              {MILESTONE_STATES.map((state) => {
                const report = checkReport(sampleView(state), "https://unstuck.example");
                return (
                  <KitExample key={state} label={`Check report status, ${state}`}>
                    <p className="rounded-panel border border-border bg-surface px-4 py-3 font-mono log-type">{report.status}</p>
                  </KitExample>
                );
              })}
            </KitGrid>
          </KitSection>

          <KitSection id="fix" title="Getting a fix" description="Agents come from NEAR Agent Market with their own listed price. Nothing here is hired.">
            <KitGrid cols={3}>
              {AGENTS.map((a) => (
                <KitExample key={a.label} label={a.label}>
                  <AgentCard {...a.props} />
                </KitExample>
              ))}
            </KitGrid>
            <KitGrid>
              <KitExample label="The work order the agent receives">
                <WorkOrder
                  repo="example-org/grant-sdk"
                  sha={SAMPLE_MILESTONE.pinnedSha}
                  image="node:22-alpine"
                  items={missing.asks.map((a, i) => ({ n: i + 1, quote: a.quote, failure: a.failure }))}
                  checks={(missing.base?.replay.steps ?? []).map((s, i) => ({ n: i + 1, command: s.command, offline: s.network === "none" }))}
                />
              </KitExample>
              <KitExample label="Hire form (try it: answers that hiring isn't switched on)">
                <HireForm action={sampleHire} milestoneId={SAMPLE_MILESTONE.id} agentId="a1" agentName="Docs Mason" priceCents={1_200} />
              </KitExample>
            </KitGrid>
            <KitGrid cols={3}>
              {JOB_STATUSES.map((status) => (
                <KitExample key={status} label={`Job ${status}`}>
                  <JobTracker status={status} agentName="Docs Mason" agentHandle="docs-mason" priceCents={1_200} createdAt={NOW} marketUrl="https://market.near.ai" autoAcceptAt={status === "delivered" ? new Date(NOW.getTime() + 2 * 86_400_000) : null} />
                </KitExample>
              ))}
            </KitGrid>
          </KitSection>

          <KitSection id="send" title="Checking and sending" description="A fix is only shown once the reviewer's own checks rerun on it.">
            <KitExample label="Before and after, one fixed, one still missing">
              <AskCompare changes={askChanges()} baseSha={SAMPLE_MILESTONE.pinnedSha} baseRunId={missing.base?.replay.id ?? null} patchRunId="00000000-0000-4000-8000-00000000c002" />
            </KitExample>
            <KitExample label="Before and after, fix not delivered">
              <AskCompare
                changes={askChanges().map((c) => ({ ...c, after: { verdict: "open", failure: null }, change: "pending" }))}
                baseSha={SAMPLE_MILESTONE.pinnedSha}
                baseRunId={missing.base?.replay.id ?? null}
                patchRunId={null}
              />
            </KitExample>
            <KitExample label="The agent's patch">
              <DiffView patch={PATCH} />
            </KitExample>
            <KitGrid>
              <KitExample label="Reply draft">
                <DraftEditor label="Reply to sample-reviewer" initial={"Thanks for the review.\n\n> Please host them on one site so the committee can verify the guides.\n\nDone in the linked pull request. The run record shows the check passing."} rows={8} hint="A draft you copy. Nothing is posted for you." />
              </KitExample>
              <KitExample label="Gates before sending">
                <GateList
                  label="Sending opens when"
                  gates={[
                    { label: "The reviewed commit was rerun", met: true },
                    { label: "A fix was delivered", met: true },
                    { label: "Every ask passes on the fix", met: false },
                  ]}
                />
              </KitExample>
            </KitGrid>
            <KitExample label="Locked part">
              <Blocked title="Nothing to send yet" body="Part 5 opens when a finished run shows nothing still missing." action={<ButtonLink href="#send" variant="secondary">See what&rsquo;s missing</ButtonLink>} />
            </KitExample>
          </KitSection>

          <KitSection id="account" title="Agent Market account" description="Sign-in uses Agent Market's device code. UNSTUCK never sees a password or a key.">
            <KitGrid>
              <KitExample label="Header chip, signed out">
                <AccountChip account={{ state: "signed-out" }} full />
              </KitExample>
              <KitExample label="Header chip, signed in">
                <AccountChip account={{ state: "signed-in", handle: IDENTITY.handle, balanceCents: 4_250 }} full />
              </KitExample>
            </KitGrid>
            <DeviceFlowStates now={NOW.toISOString()} identity={IDENTITY} />
            <KitGrid>
              <KitExample label="Claim code on its own">
                <ClaimCode userCode="WDJB-MJHT" verificationUri="https://market.near.ai/device" verificationUriComplete={null} expiresAt={new Date(NOW.getTime() + 300_000)} now={NOW} />
              </KitExample>
              <KitExample label="Access terms">
                <AccessTerms />
              </KitExample>
            </KitGrid>
            <KitExample label="Account page, signed in">
              <AccountOverview account={ACCOUNT} now={NOW} />
            </KitExample>
            <KitExample label="Account page, signed out">
              <SignedOutAccount />
            </KitExample>
            <KitExample label="Hires, one per status">
              <HireList hires={HIRES} />
            </KitExample>
            <KitExample label="Hire status chips">
              <div className="flex flex-wrap gap-2">
                {HIRES.map((h) => (
                  <HireStatusChip key={h.id} status={h.status} />
                ))}
              </div>
            </KitExample>
            <KitGrid>
              {(["neutral", "waiting", "good", "bad"] as const).map((tone) => (
                <KitExample key={tone} label={`Notice, ${tone}`}>
                  <Notice tone={tone} title={`A ${tone} notice`}>
                    One line saying what happened and what to do next.
                  </Notice>
                </KitExample>
              ))}
            </KitGrid>
            <KitExample label="Steps">
              <Steps title="What happens next" items={["Sign in to Agent Market.", "Type the code.", "Approve hiring access."]} />
            </KitExample>
          </KitSection>

          <KitSection id="limit" title="Spending limit" description="Set once, before the first hire. Every hire stays under it.">
            <LimitDemo now={NOW.toISOString()} identity={IDENTITY} />
            <KitGrid>
              {LIMITS.map(({ label, limit }) => (
                <KitExample key={label} label={`Limit meter, ${label.toLowerCase()}`}>
                  <LimitMeter limit={limit} now={NOW} />
                </KitExample>
              ))}
              <KitExample label="Hire ruler, a leftover sliver">
                <HireRuler perHireCents={3_000} totalCents={10_000} />
              </KitExample>
              <KitExample label="Hire ruler, empty">
                <HireRuler perHireCents={null} totalCents={null} />
              </KitExample>
            </KitGrid>
          </KitSection>

          <KitSection id="study" title="Study and agents" description="Counts always carry their denominator. Charts use the tag colours and name every segment.">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sheet border border-border bg-border lg:grid-cols-4">
              <Figure value={3} of={7}>
                asks still missing
              </Figure>
              <Figure value={12} of={30}>
                checks failed
              </Figure>
              <Figure value={5} unit="reviews">
                read across 2 programs
              </Figure>
              <Figure value="None">reviews with a dated comment</Figure>
            </div>
            <KitGrid>
              <KitExample label="Verdict bar, mixed">
                <VerdictBar tally={{ missing: 3, works: 2, unsure: 2 }} caption="Asks by verdict" />
              </KitExample>
              <KitExample label="Verdict bar, nothing decided">
                <VerdictBar tally={{ missing: 0, works: 0, unsure: 0 }} caption="Asks by verdict" />
              </KitExample>
              <KitExample label="Code block with copy">
                <CodeBlock title="Request" code={JSON.stringify({ thread: SAMPLE_MILESTONE.reviewerCommentUrl }, null, 2)} />
              </KitExample>
              <KitExample label="Code block, brief">
                <CodeBlock title="Brief" code={checkReport(missing, "https://unstuck.example").brief} />
              </KitExample>
            </KitGrid>
          </KitSection>

          <KitSection id="states" title="Page states" description="What a page shows instead of its content.">
            <KitGrid>
              <KitExample label="Not found">
                <StatePanel headingLevel={2} tag={<PunchTag verdict="unsure">Not found</PunchTag>} title="No milestone at this link" actions={<ButtonLink href="#states">Start a milestone</ButtonLink>}>
                  The link may be cut short. Milestone links end in a 36-character id.
                </StatePanel>
              </KitExample>
              <KitExample label="Needs something first">
                <StatePanel headingLevel={2} tag={<PunchTag verdict="open">Needs Agent Market</PunchTag>} title="Sign in before you hire" actions={<ButtonLink href="#account">Connect Agent Market</ButtonLink>}>
                  Hiring uses your own Agent Market account and the limit you set.
                </StatePanel>
              </KitExample>
            </KitGrid>
          </KitSection>

          <KitSection
            id="landing"
            title="Landing patterns"
            description="For fitting a landing section into one screen (docs/DESIGN.md 7.3). Narrow the window to see the rail swipe and the fine print fold."
          >
            <KitExample label="Rail: swipes below 1024 px, three columns from it">
              <Rail label="Three sample cards" until="lg" flush className="gap-3 lg:grid-cols-3">
                {["First", "Second", "Third"].map((name) => (
                  <li key={name} className="rounded-sheet border border-border bg-surface p-5">
                    <p className="text-h3 font-semibold">{name} card</p>
                    <p className="mt-1 text-small text-ink-secondary">Each card leaves a peek of the next one while the row swipes.</p>
                    <a href="#landing" className="mt-2 inline-flex min-h-11 items-center text-small font-medium underline underline-offset-4">
                      A link in the {name.toLowerCase()} card
                    </a>
                  </li>
                ))}
              </Rail>
            </KitExample>
            <KitExample label="Fold: a disclosure below 1024 px or 760 px tall, plain text elsewhere">
              <Fold label="Sample fine print" until="lg" short="short" as="p" className="max-w-[40rem] text-small text-ink-secondary">
                Fine print that matters but not first: it folds behind its label on narrow or short screens and shows plainly on the rest.
              </Fold>
            </KitExample>
          </KitSection>
        </div>
      </div>
    </main>
  );
}

