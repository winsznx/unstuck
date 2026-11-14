import type { ReactNode } from "react";
import { ButtonLink } from "@/components/button";
import { START } from "@/components/shell/nav";
import { PunchTag, tagFor, type TagVerdict } from "@/components/tag";
import { day, duration, repoName, sha7 } from "@/lib/format";
import type { MilestoneView } from "@/lib/queries";
import { AskWords } from "./ask-words";
import type { Showcase } from "./facts";
import { Fold } from "./fold";
import { Rail } from "./rail";
import { Screen, ScreenHeading } from "./screen";

/** How a run turns exit codes into a tag (packages/core verdictFor), in the words the tag uses. */
const TAG_RULES: readonly { verdict: TagVerdict; rule: string }[] = [
  { verdict: "works", rule: "every check for the ask exits 0" },
  { verdict: "missing", rule: "one fails or runs out of time" },
  { verdict: "unsure", rule: "no check covers it, or none ran" },
];

const RECORD_USE =
  "Use the record to agree with your reviewer on what each ask needs before you push, or to show a check already passes on the commit they reviewed.";

/**
 * The stage behind the frames. Phones have none, so the rail's cards bleed to the screen's edges on the canvas; up to
 * xl it's a concrete band across the screen behind the rail; from xl the stage panel holds the three frames.
 */
const STAGE =
  "stage max-sm:bg-transparent max-sm:bg-none sm:max-xl:-mx-(--screen-gutter) sm:max-xl:px-(--screen-gutter) sm:max-xl:py-(--screen-gap-sm) xl:rounded-stage xl:p-(--screen-gap-md)";

/**
 * The steps swipe on a phone and, two at a time, on a tablet or laptop under 1024 px tall; a portrait tablet that tall
 * and every screen from 1280 px show the three side by side.
 */
export function How({ view, show }: { view: MilestoneView | undefined; show: Showcase | null }) {
  const milestone = view?.milestone;
  return (
    <Screen id="how" titleId="how-title" next={{ href: "#proof", label: "Proof your reviewer can open" }}>
      <ScreenHeading
        n={2}
        titleId="how-title"
        title="You pick the asks and checks. UNSTUCK runs them."
        lead="This part works today. Paste one link, tick the sentences that are asks and give each a check. Every tag describes the last commit before the review."
      />
      <div className="grid gap-(--screen-gap-md)">
        <div className={STAGE}>
          <Rail
            label="How it works, step by step"
            tall
            until="sm"
            shortUntil="xl"
            as="ol"
            className="gap-(--screen-gap-md) max-sm:[--rail-item:min(100cqi-2*var(--rail-inset)-1.25rem,24rem)] sm:grid-cols-3 md:[--rail-item:calc((100cqi-2*var(--rail-inset)-3rem-var(--screen-gap-md))/2)]"
          >
            <Frame
              n={1}
              title="Paste the link"
              body="UNSTUCK reads the thread and finds the last commit before the comment. You confirm it before anything runs."
              example="What it found"
            >
              {show && milestone && (
                <div className="space-y-(--screen-gap-sm)">
                  <p className="truncate rounded-control border border-border-control bg-surface px-3 py-2.5 text-small" title={milestone.threadUrl}>
                    {milestone.threadUrl.replace(/^https:\/\//, "")}
                  </p>
                  <ul className="space-y-1.5 text-small">
                    <Found>
                      Comment by {show.reviewer}
                      {milestone.reviewerCommentAt ? `, ${day(milestone.reviewerCommentAt)}` : ""}
                    </Found>
                    {show.thread && (
                      <Found>
                        {show.thread.kind} #{show.thread.number} in {show.threadRepo}
                      </Found>
                    )}
                    <Found>
                      Code: {repoName(milestone.codeRepoUrl)} at{" "}
                      <span className="font-mono log-type" title={milestone.pinnedSha ?? undefined}>
                        {sha7(milestone.pinnedSha)}
                      </span>
                    </Found>
                  </ul>
                </div>
              )}
            </Frame>
            <Frame
              n={2}
              title="Pick the asks and their checks"
              body="UNSTUCK suggests checks for docs, tests, builds, lint, README, CI, license, Docker and examples, and offers any command your reviewer wrote. Change any of them. Your reviewer sees each one in full."
              example="The ask and its check"
            >
              {show?.ask && (
                <div className="space-y-(--screen-gap-sm)">
                  <div className="rounded-panel border border-open-edge bg-open-soft px-3 py-3">
                    <div className="flex items-start gap-3">
                      <span aria-hidden className="mt-1 grid size-4 shrink-0 place-items-center rounded-tag bg-ink text-on-action">
                        <Tick />
                      </span>
                      <AskWords quote={show.ask.quote} focus={show.focus} className="min-w-0 flex-1 font-quote text-body leading-snug" />
                    </div>
                    <div className="mt-2.5 pl-7">
                      <PunchTag verdict="open">{`Ask ${show.askNumber}`}</PunchTag>
                    </div>
                  </div>
                  {show.check && (
                    <p className="rounded-control bg-log px-3 py-2 font-mono log-type text-log-ink" title={show.check.command}>
                      <span className="sr-only">Its check: </span>
                      <span className="line-clamp-2 wrap-anywhere">$ {show.check.command}</span>
                    </p>
                  )}
                </div>
              )}
            </Frame>
            <Frame
              n={3}
              title="Read the tag"
              body={
                <dl className="grid gap-1.5">
                  {TAG_RULES.map(({ verdict, rule }) => (
                    <div key={verdict} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <dt className="flex">
                        <PunchTag verdict={verdict} />
                      </dt>
                      <dd className="text-small text-ink-secondary">{rule}</dd>
                    </div>
                  ))}
                </dl>
              }
              example="A tag from a stored run"
            >
              {show?.ask && show.check && (
                <div className="space-y-(--screen-gap-sm)">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-small text-ink-secondary">
                    <PunchTag verdict={tagFor(show.ask.verdict)} n={show.askNumber} />
                    <span>
                      at{" "}
                      <span className="font-mono log-type text-ink" title={milestone?.pinnedSha ?? undefined}>
                        {sha7(milestone?.pinnedSha)}
                      </span>
                    </span>
                  </p>
                  <div className="rounded-control bg-log px-3 py-2.5 font-mono log-type">
                    {show.ask.failure?.line && <p className="text-log-fail wrap-anywhere">{show.ask.failure.line}</p>}
                    <p className="text-log-muted">
                      <span className={show.check.exitCode === 0 ? "text-log-pass" : "text-log-fail"}>
                        {show.check.timedOut === 1 ? "timeout" : `exit ${show.check.exitCode ?? "?"}`}
                      </span>
                      , network {show.check.network === "none" ? "off" : "on"}, {duration(show.check.durationMs)}
                    </p>
                  </div>
                  {show.checkScope && <p className="text-small text-ink-secondary">{show.checkScope}</p>}
                </div>
              )}
            </Frame>
            <li className="flex min-w-0 flex-col justify-between gap-(--screen-gap-md) rounded-sheet border border-border p-(--screen-gap-md) sm:hidden">
              <p className="text-small text-pretty text-ink-secondary">{RECORD_USE}</p>
              <ButtonLink href={START.href} size="lg" className="self-start">
                {START.label}
              </ButtonLink>
            </li>
          </Rail>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 max-sm:hidden">
          <ButtonLink href={START.href} size="lg">
            {START.label}
          </ButtonLink>
          <p className="max-w-176 text-small text-pretty text-ink-secondary">{RECORD_USE}</p>
        </div>
      </div>
    </Screen>
  );
}

/**
 * One step: its words, then the step on the showcase run. On phones the example folds under `example`, so a card is
 * the step's words and the rail stays one screen tall; a phone taller than 760 px has the room to show it open. From
 * xl the three frames share their rows, so each example starts level with the others whatever the length of the words
 * above it.
 */
function Frame({ n, title, body, example, children }: { n: number; title: string; body: ReactNode; example: string; children: ReactNode }) {
  return (
    <li className="flex min-w-0 flex-col rounded-sheet border border-border bg-surface p-(--screen-gap-md) shadow-object xl:row-span-3 xl:grid xl:grid-cols-1 xl:grid-rows-subgrid xl:gap-y-0">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-control border border-ink text-small font-bold tabular-nums">
          {n}
        </span>
        <h3 className="text-h3 font-semibold">{title}</h3>
      </div>
      {typeof body === "string" ? (
        <p className="mt-2 tight:mt-1.5 text-small text-ink-secondary sm:text-pretty">{body}</p>
      ) : (
        <div className="mt-2.5">{body}</div>
      )}
      {children && (
        <Fold label={example} until="sm" tall className="mt-(--screen-gap-sm)">
          {children}
        </Fold>
      )}
    </li>
  );
}

function Found({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-ink text-on-action">
        <Tick />
      </span>
      <span className="min-w-0 wrap-anywhere">{children}</span>
    </li>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 6.2 5 8.5 9.5 3.5" />
    </svg>
  );
}
