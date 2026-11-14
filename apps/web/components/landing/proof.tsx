import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ButtonLink } from "@/components/button";
import { PunchTag, tagFor } from "@/components/tag";
import { day, duration, repoName, sha7 } from "@/lib/format";
import type { AskView, CommandResult, MilestoneView, ReplayView } from "@/lib/queries";
import { AskWords } from "./ask-words";
import type { Showcase } from "./facts";
import { Fold } from "./fold";
import { Rail } from "./rail";
import { Screen, ScreenPin } from "./screen";

/**
 * What a reviewer checks first on a record, in the order the excerpt marks them. B's limits are the ones /start sets
 * (app/start/actions.ts, images.ts) and the runner enforces (packages/replay DockerRunner).
 */
const POINTS = [
  {
    key: "A",
    title: "The commit they reviewed",
    body: "The last commit before your reviewer's comment, which you confirm before anything runs. Later pushes don't change it, so a record can't show a fix yet.",
  },
  {
    key: "B",
    title: "Network off",
    body: "The checkout and install go online. Each check runs in a fresh container with no network, so the result depends only on the commit and the check. Whether the check fits the ask is your reviewer's call.",
    detail:
      "Containers: Node 22, Python 3.12, Rust 1.84 without the wasm32 target, Go 1.23 or Alpine 3.20. The install gets 15 minutes. Each check gets 10, with 2 CPUs and 3 GB, and running out of time counts as Still missing.",
  },
  {
    key: "C",
    title: "A fingerprint of every output",
    body: "Each output is saved with its SHA-256 hash, and every record carries a script that reruns its steps with Docker, so anyone can compare without this site.",
  },
] as const;

type Point = (typeof POINTS)[number];

const LIMITS_LABEL = "Containers and time limits";

/**
 * From 768 px the points sit beside the record sheet, under the heading on a tablet and with it from 1024 px. On a
 * phone neither fits a screen, so the record's parts and the points become one row of cards that swipes.
 */
export function Proof({ view, show }: { view: MilestoneView | undefined; show: Showcase | null }) {
  const base = view?.base ?? null;
  return (
    <Screen id="proof" titleId="proof-title" tone="log" next={{ href: "#fix", label: "Getting it fixed" }}>
      <div className="grid grid-cols-1 gap-(--screen-gap) md:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:items-center lg:gap-x-12 lg:not-compact:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:not-compact:gap-x-16 xl:not-compact:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-(--screen-gap)">
          <div className="md:col-span-2">
            <h2 id="proof-title" className="flex items-start gap-3.5 text-section font-semibold text-balance text-log-strong lg:gap-4">
              <ScreenPin n={3} tone="log" />
              <span className="min-w-0">A link your reviewer can check for themselves.</span>
            </h2>
            <p className="mt-(--screen-gap-md) max-w-(--screen-measure) text-lead text-pretty text-log-ink md:max-lg:max-w-none">
              Every run gets a public page with what ran and what came out, on the commit your reviewer looked at. It shows how you read their asks, not a
              fix.
            </p>
          </div>
          {view && base ? (
            <div className="flex min-w-0 flex-col gap-(--screen-gap-md) max-md:hidden lg:gap-(--screen-gap)">
              <Points />
              <RecordActions runId={base.replay.id} className="lg:hidden" />
            </div>
          ) : (
            <Points />
          )}
        </div>
        {view && base ? (
          <>
            <RecordExcerpt view={view} base={base} show={show} />
            <RecordCards view={view} base={base} show={show} />
          </>
        ) : (
          <NoRecord />
        )}
      </div>
    </Screen>
  );
}

function Points() {
  return (
    <ol className="space-y-(--screen-gap-sm) xl:not-compact:space-y-(--screen-gap)">
      {POINTS.map((point) => (
        <li key={point.key} className="flex gap-3 lg:gap-4">
          <Callout tone="log">{point.key}</Callout>
          <div className="min-w-0">
            <h3 className="text-h3 font-semibold text-log-strong">{point.title}</h3>
            <p className="mt-0.5 text-body text-log-ink">{point.body}</p>
            {"detail" in point && (
              <Fold label={LIMITS_LABEL} until="lg" short="compact" as="p" className="mt-1.5 text-small text-log-muted [&>summary]:text-log-ink [&>summary]:hover:text-log-strong">
                {point.detail}
              </Fold>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * The top of a real run record: the review it answers, the commit and image, then each step with the exact command
 * it ran and, for a check, the reviewer's words and the tag it gave. A, B and C mark the three things a reviewer
 * checks first.
 */
function RecordExcerpt({ view, base, show }: { view: MilestoneView; base: ReplayView; show: Showcase | null }) {
  const failed = failureOf(view);
  const askFor = (r: CommandResult) => askOfStep(view.asks, base, r);
  return (
    <div className="min-w-0 max-md:hidden">
      <figure className="m-0 overflow-hidden rounded-sheet bg-surface text-ink shadow-sheet">
        <figcaption className="border-b border-border px-5 py-4 lg:px-6 compact:py-3">
          <RecordHead view={view} base={base} show={show} />
        </figcaption>
        <table className="w-full table-fixed text-left text-small">
          <thead className="text-ink-secondary">
            <tr className="border-b border-border">
              <th scope="col" className="py-2.5 pr-2 pl-5 font-medium compact:py-2 md:max-lg:pl-4 lg:pl-6">
                Step
              </th>
              <th scope="col" className="w-26 px-2 py-2.5 font-medium compact:py-2 md:max-lg:w-24">
                <span className="inline-flex items-center gap-1.5">
                  Network <Callout size="sm">B</Callout>
                </span>
              </th>
              <th scope="col" className="w-12 px-2 py-2.5 font-medium compact:py-2">
                Exit
              </th>
              <th scope="col" className="w-20 px-2 py-2.5 font-medium compact:py-2 md:max-lg:w-16">
                Time
              </th>
              <th scope="col" className="w-28 py-2.5 pr-5 pl-2 font-medium compact:py-2 md:max-lg:w-22 md:max-lg:pr-4 lg:pr-6">
                <span className="inline-flex items-center gap-1.5">
                  Output <Callout size="sm">C</Callout>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {base.results.map((r) => (
              <StepRows key={r.id} result={r} ask={askFor(r)} show={show} />
            ))}
          </tbody>
        </table>
        {failed?.line && <FailingLine line={failed.line} className="border-t border-border px-5 py-3 compact:py-2 lg:px-6" />}
      </figure>
      <RecordActions runId={base.replay.id} className="mt-(--screen-gap-md) max-lg:hidden" />
    </div>
  );
}

/** Under the record from 1024 px; on a tablet under the points, where the narrower column has room for them. */
function RecordActions({ runId, className }: { runId: string; className: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-1 ${className}`}>
      <OpenRecord runId={runId} />
      <ScriptLink runId={runId} />
    </div>
  );
}

/**
 * The record's caption: the review it answers, the commit (A) and the image the checks ran in. On a phone the image
 * moves to the steps card, and on a short phone, where the button under the rail doesn't fit, the caption opens the
 * record itself.
 */
function RecordHead({
  view: { milestone },
  base,
  show,
  phone = false,
}: {
  view: MilestoneView;
  base: ReplayView;
  show: Showcase | null;
  phone?: boolean;
}) {
  return (
    <>
      <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-small text-ink-secondary">
        <span className={`font-semibold text-ink ${phone ? "tight:hidden" : ""}`}>Run record</span>
        {phone && (
          <Link
            href={`/runs/${base.replay.id}`}
            className="hidden min-h-11 items-center font-semibold text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink tight:inline-flex"
          >
            Open this run record
          </Link>
        )}
        {base.replay.finishedAt && <span>Ran {day(base.replay.finishedAt)}</span>}
      </p>
      <p className="mt-2 text-h3 font-semibold wrap-anywhere compact:mt-1.5">
        {repoName(milestone.codeRepoUrl)} at{" "}
        <span className="inline-flex items-center gap-3 align-middle">
          <span className="font-mono font-normal" title={milestone.pinnedSha ?? undefined}>
            {sha7(milestone.pinnedSha)}
          </span>
          <Callout>A</Callout>
        </span>
      </p>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-small compact:mt-2 compact:gap-y-0.5">
        <dt className="text-ink-secondary">Review</dt>
        <dd className="min-w-0">
          <a href={milestone.reviewerCommentUrl ?? milestone.threadUrl} rel="nofollow noreferrer" className="underline decoration-border-strong underline-offset-4 hover:decoration-ink">
            {show?.reviewer ?? "The reviewer"}
            {milestone.reviewerCommentAt ? ` on ${day(milestone.reviewerCommentAt)}` : ""}
          </a>
          {show && (
            <span className="text-ink-secondary">
              , {show.program}
              {show.thread ? ` ${show.thread.kind.toLowerCase()} #${show.thread.number}` : ""}
            </span>
          )}
        </dd>
        <dt className="text-ink-secondary">Commit</dt>
        <dd className="min-w-0">
          <span className="font-mono log-type">{sha7(milestone.pinnedSha)}</span>, the last commit before that review
        </dd>
        {!phone && <ImageRow image={base.replay.image} />}
      </dl>
    </>
  );
}

function ImageRow({ image }: { image: string }) {
  return (
    <>
      <dt className="text-ink-secondary">Image</dt>
      <dd className="min-w-0 font-mono log-type wrap-anywhere">{image}</dd>
    </>
  );
}

/** One step as a register line, and for a check a second line with the words it checks, its tag and its whole command. */
function StepRows({ result: r, ask, show }: { result: CommandResult; ask: { view: AskView; n: number } | null; show: Showcase | null }) {
  const check = r.step > 0;
  const pad = check ? "pt-2.5 compact:pt-2" : "py-2.5 compact:py-2";
  return (
    <>
      <tr className={check ? "" : "border-b border-border last:border-b-0"}>
        <td className={`${pad} pr-2 pl-5 align-top font-medium wrap-break-word md:max-lg:pl-4 lg:pl-6`}>{stepName(r)}</td>
        <td className={`${pad} px-2 align-top text-ink-secondary`}>{r.network === "none" ? "off" : "on"}</td>
        <td className={`${pad} truncate px-2 align-top font-mono log-type font-medium ${exitColor(r)}`}>{exitText(r)}</td>
        <td className={`${pad} px-2 align-top text-ink-secondary`}>{duration(r.durationMs)}</td>
        <td className={`${pad} truncate pr-5 pl-2 align-top font-mono log-type text-ink-secondary md:max-lg:pr-4 lg:pr-6`} title={r.outputSha256}>
          {r.outputSha256.slice(0, 10)}
        </td>
      </tr>
      {check && (
        <tr className="border-b border-border last:border-b-0">
          <td colSpan={5} className="pr-5 pb-3 pl-5 compact:pb-2.5 md:max-lg:px-4 lg:pr-6 lg:pl-6">
            <div className="mt-1.5 space-y-1.5 compact:mt-1">
              <CheckWords ask={ask} show={show} />
              <Command result={r} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * The record on a phone, as cards that swipe. The first is the record's first decided check: the reviewer's words with
 * their tag beside the line that failed, so a phone opens on the punch list like the wide record does. Then its
 * caption, the steps, each other check's words, each check's whole command, and last what A, B and C mark, with B's
 * containers and limits as a card of their own. The script link rides with C there, since the button row has room for
 * one control. The rail's scroller clips the sr-only text inside the cards, so it can't widen the page.
 */
function RecordCards({ view, base, show }: { view: MilestoneView; base: ReplayView; show: Showcase | null }) {
  const failed = failureOf(view);
  const runId = base.replay.id;
  const checks = base.results
    .filter((r) => r.step > 0)
    .map((r) => ({ result: r, ask: askOfStep(view.asks, base, r), line: failed?.step === r.step ? failed.line : null }));
  const lead = checks.find((c) => c.ask || c.line) ?? null;
  const wordsCard = ({ result: r, ask, line }: (typeof checks)[number]) => (
    <li key={`words-${r.id}`}>
      <Sheet>
        <p className="flex items-baseline justify-between gap-3 text-small">
          <span className="font-medium wrap-anywhere">{stepName(r)}</span>
          <span className={`font-mono log-type font-medium ${exitColor(r)}`}>exit {exitText(r)}</span>
        </p>
        <div className="mt-1.5">
          <CheckWords ask={ask} show={show} />
        </div>
        {line && <FailingLine line={line} className="mt-2.5 rounded-control px-2.5 py-1.5" />}
      </Sheet>
    </li>
  );
  return (
    <div className="flex min-w-0 flex-col gap-(--screen-gap-md) md:hidden">
      <Rail label="Run record excerpt, then what A, B and C mark" until="md" as="ol" tall className="gap-3 [--rail-item:min(100cqi-2*var(--rail-inset)-1.5rem,24rem)]">
        {lead && wordsCard(lead)}
        <li>
          <Sheet>
            <RecordHead view={view} base={base} show={show} phone />
          </Sheet>
        </li>
        <li>
          <Sheet>
            <StepsTable results={base.results} />
            <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 text-small">
              <ImageRow image={base.replay.image} />
            </dl>
          </Sheet>
        </li>
        {checks.map((check) => (
          <Fragment key={check.result.id}>
            {check !== lead && (check.ask || check.line) && wordsCard(check)}
            <li>
              <Sheet>
                <p className="text-small font-medium wrap-anywhere">{stepName(check.result)}</p>
                <Command result={check.result} className="mt-1.5 border-l-2 border-border-strong pl-2.5" />
              </Sheet>
            </li>
          </Fragment>
        ))}
        {POINTS.map((point) => (
          <Fragment key={point.key}>
            <li>
              <PointCard point={point}>{point.key === "C" && <ScriptLink runId={runId} className="mt-1" />}</PointCard>
            </li>
            {"detail" in point && (
              <li>
                <div className="relative h-full rounded-panel border border-log-muted p-4 tight:p-3">
                  <h3 className="flex items-center gap-2 text-small font-semibold text-log-strong">
                    <Callout tone="log" size="sm">
                      {point.key}
                    </Callout>
                    {LIMITS_LABEL}
                  </h3>
                  <p className="mt-1.5 text-small text-log-ink">{point.detail}</p>
                </div>
              </li>
            )}
          </Fragment>
        ))}
      </Rail>
      <div className="tight:hidden">
        <OpenRecord runId={runId} />
      </div>
    </div>
  );
}

function Sheet({ children }: { children: ReactNode }) {
  return <div className="relative h-full rounded-panel bg-surface p-4 text-ink tight:p-3">{children}</div>;
}

/** The steps as a phone's register: name, network (B), exit and the output's hash (C). */
function StepsTable({ results }: { results: readonly CommandResult[] }) {
  return (
    <table className="w-full text-left text-small">
      <thead className="text-ink-secondary">
        <tr>
          <th scope="col" className="pr-2 pb-1.5 font-medium">
            Step
          </th>
          <th scope="col" className="pr-2 pb-1.5 font-medium">
            <span className="inline-flex items-center gap-1.5">
              Network <Callout size="sm">B</Callout>
            </span>
          </th>
          <th scope="col" className="pr-2 pb-1.5 font-medium">
            Exit
          </th>
          <th scope="col" className="pb-1.5 font-medium">
            <span className="inline-flex items-center gap-1.5">
              Output <Callout size="sm">C</Callout>
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr key={r.id} className="border-t border-border">
            <td className="py-2 pr-2 align-top font-medium wrap-anywhere">{stepName(r)}</td>
            <td className="py-2 pr-2 align-top text-ink-secondary">{r.network === "none" ? "off" : "on"}</td>
            <td className={`py-2 pr-2 align-top font-mono log-type font-medium ${exitColor(r)}`}>{exitText(r)}</td>
            <td className="py-2 align-top font-mono log-type text-ink-secondary" title={r.outputSha256}>
              {r.outputSha256.slice(0, 10)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PointCard({ point, children }: { point: Point; children?: ReactNode }) {
  return (
    <div className="relative h-full rounded-panel border border-log-muted p-4 tight:p-3">
      <h3 className="flex items-center gap-3 text-h3 font-semibold text-log-strong">
        <Callout tone="log">{point.key}</Callout>
        <span className="min-w-0">{point.title}</span>
      </h3>
      <p className="mt-2 text-body text-log-ink">{point.body}</p>
      {children}
    </div>
  );
}

/** The words a check tests and the tag it gave. */
function CheckWords({ ask, show }: { ask: { view: AskView; n: number } | null; show: Showcase | null }) {
  if (!ask) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span className="min-w-0 font-quote text-body text-ink">
        {show?.ask?.id === ask.view.id ? <AskWords quote={ask.view.quote} focus={show.focus} /> : <span className="line-clamp-2">{ask.view.quote}</span>}
      </span>
      <PunchTag verdict={tagFor(ask.view.verdict)} n={ask.n} />
    </p>
  );
}

/** The exact command, wrapped, so the printed line visibly comes from it. */
function Command({ result, className = "rounded-control bg-surface-muted px-2.5 py-1.5" }: { result: CommandResult; className?: string }) {
  return <p className={`font-mono log-type wrap-anywhere text-ink-secondary ${className}`}>{result.command}</p>;
}

function FailingLine({ line, className }: { line: string; className: string }) {
  return (
    <p className={`bg-fails-soft font-mono log-type text-fails-text wrap-anywhere ${className}`}>
      <span className="sr-only">Failing line: </span>
      {line}
    </p>
  );
}

function OpenRecord({ runId }: { runId: string }) {
  return (
    <ButtonLink href={`/runs/${runId}`} variant="inverse">
      Open this run record
    </ButtonLink>
  );
}

function ScriptLink({ runId, className = "" }: { runId: string; className?: string }) {
  return (
    <Link
      href={`/runs/${runId}#reproduce-title`}
      className={`inline-flex min-h-11 items-center text-small font-medium text-log-ink underline underline-offset-4 hover:text-log-strong ${className}`}
    >
      Get the script to run it yourself
    </Link>
  );
}

/** The ask a check step was planned for, with its number on the punch list. */
function askOfStep(asks: readonly AskView[], run: ReplayView, result: CommandResult): { view: AskView; n: number } | null {
  const askId = run.replay.steps[result.step - 1]?.askId;
  const index = askId ? asks.findIndex((a) => a.id === askId) : -1;
  const view = asks[index];
  return view ? { view, n: index + 1 } : null;
}

/** The first ask whose check printed a failing line: the line the record shows in red. */
const failureOf = (view: MilestoneView) => view.asks.find((a) => a.failure?.line)?.failure ?? null;

const stepName = (r: CommandResult) => (r.step === 0 ? "checkout" : r.name);
const exitText = (r: CommandResult) => (r.timedOut === 1 ? "timeout" : String(r.exitCode ?? "?"));
const exitColor = (r: CommandResult) => (r.exitCode === 0 && r.timedOut !== 1 ? "text-passes-text" : "text-fails-text");

function NoRecord() {
  return (
    <p className="rounded-sheet border border-dashed border-log-muted p-6 text-log-ink">
      The first run record appears here once a comment has been rerun.
    </p>
  );
}

/** A letter tying a point in the text to the place it shows on the record. */
function Callout({ children, tone = "paper", size = "md" }: { children: ReactNode; tone?: "paper" | "log"; size?: "md" | "sm" }) {
  const color = tone === "log" ? "border-log-strong text-log-strong" : "border-ink text-ink";
  const box = size === "sm" ? "size-5 text-tag" : "size-7 text-small";
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full border font-bold ${box} ${color}`}>
      {children}
    </span>
  );
}
