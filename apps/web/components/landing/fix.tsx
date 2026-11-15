import Link from "next/link";
import type { ReactNode } from "react";
import { repoName, sha7 } from "@/lib/format";
import type { MilestoneView } from "@/lib/queries";
import { AskWords } from "./ask-words";
import type { Showcase } from "./facts";
import { Fold } from "./fold";
import { Rail } from "./rail";
import { SCREEN_HEADING_GRID, Screen, ScreenPin } from "./screen";

const PAYMENT =
  "You hire one on NEAR Agent Market and pay on its own checkout. Its fix runs through the same check, and an ask turns Fixed only when it exits 0.";

/**
 * Parts 3 to 5 of a milestone (docs/DESIGN.md 7.2): first what's live, what's built and what isn't built, then the
 * job an agent gets as one dashed work order. The hire screen it links to reads live NEAR Agent Market listings, and
 * its Hire button sends the owner to Agent Market's checkout page.
 *
 * From 768 px the three states and the three stages are rows of three, and what the agent gets runs under the stages
 * as the work order's last strip. On a phone both rows swipe and the payment terms join the job's contents in a fold;
 * on a phone under 600 px tall the stages fold too, so what exists today always stays in view.
 */
export function Fix({ view, show }: { view: MilestoneView | undefined; show: Showcase | null }) {
  const milestone = view?.milestone;
  const sha = milestone?.pinnedSha ?? null;
  const line = show?.ask?.failure?.line ?? null;

  return (
    <Screen id="fix" titleId="fix-title" next={{ href: "#limits", label: "Who it's for" }}>
      <div className={`${SCREEN_HEADING_GRID} lg:items-start`}>
        <h2 id="fix-title" className="flex items-start gap-3.5 text-section font-semibold text-balance lg:gap-4">
          <ScreenPin n={4} />
          <span className="min-w-0">Next: hire the fix on NEAR Agent Market.</span>
        </h2>
        <div className="max-w-(--screen-measure) text-lead text-pretty text-ink-secondary lg:pb-1">
          <p>A failing check is a job an agent can take: the reviewer&apos;s words, the line that failed and a command that has to exit 0.</p>
          <p className={show?.ask ? "max-md:hidden" : ""}>{PAYMENT}</p>
        </div>
      </div>
      <div className="grid gap-(--screen-gap) max-md:gap-(--screen-gap-md)">
        <Rail label="What exists today" until="md" className="gap-3 md:grid-cols-3 md:gap-4">
          <Status live title="Live today">
            Checks and run records, NEAR AI picking asks, checking your fix, and an MCP server for agents.
          </Status>
          <Status title="Built">
            Sign-in, a spending limit and hiring from live agent listings. You pay on Agent Market&apos;s own page.
            {show && (
              <>
                {" "}
                <Link
                  href={`/m/${show.milestoneId}/fix`}
                  className="font-medium whitespace-nowrap text-ink underline underline-offset-4 hover:decoration-ink"
                >
                  Open the hire screen
                </Link>
              </>
            )}
          </Status>
          <Status title="Not built yet">
            UNSTUCK&apos;s own market listing, so others can hire it there, and a Claude Code skill.
          </Status>
        </Rail>
        <div className="md:overflow-hidden md:rounded-sheet md:border md:border-dashed md:border-border-strong md:bg-surface">
          <Fold label="The steps: hire, check, send" short="tight">
            <Rail label="The job an agent would get" until="md" as="ol" className="gap-3 md:grid-cols-3 md:gap-0">
              <Stage
                n={1}
                title="Hire an agent"
                body="It will get the reviewer's words, the line that failed and your public repo at that commit. It won't get your keys or write access."
              />
              <Stage
                n={2}
                title="Check its change"
                body="The same checks run again on that commit with its change applied, network off. This already works for your own fix."
              />
              <Stage
                n={3}
                title="Send it"
                body="Once they pass, you'll get a pull request and a reply draft that links each check's run. You read both and post them yourself."
              />
            </Rail>
          </Fold>
          {show?.ask && (
            <Fold
              label="The job in full"
              until="md"
              className="max-md:mt-(--screen-gap-sm) md:border-t md:border-dashed md:border-border-strong md:bg-surface-muted md:px-7 md:py-(--screen-gap-sm) lg:not-compact:py-(--screen-gap-md)"
            >
              <p className="text-ink-secondary md:hidden">{PAYMENT}</p>
              <dl className="grid gap-x-8 gap-y-2.5 text-small max-md:mt-2.5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.75fr)]">
                <Row term="The reviewer's words">
                  <AskWords quote={show.ask.quote} focus={show.focus} className="font-quote text-body" />
                </Row>
                {line && (
                  <Row term="The line that failed">
                    <span className="font-mono log-type text-fails-text wrap-anywhere">{line}</span>
                  </Row>
                )}
                {milestone && (
                  <Row term="Your repo">
                    <span className="font-mono log-type">
                      <span className="whitespace-nowrap">{repoName(milestone.codeRepoUrl)}</span> at <span title={sha ?? undefined}>{sha7(sha)}</span>
                    </span>
                  </Row>
                )}
              </dl>
            </Fold>
          )}
        </div>
      </div>
    </Screen>
  );
}

/** One line of what exists: solid when it's live, dashed when it isn't, as everywhere in the product. */
function Status({ title, live = false, children }: { title: string; live?: boolean; children: ReactNode }) {
  return (
    <li
      className={`min-w-0 rounded-panel px-4 py-3 lg:not-compact:px-5 lg:not-compact:py-4 ${live ? "border border-border-strong bg-surface" : "border border-dashed border-border-strong"}`}
    >
      <p className="flex items-center gap-2 text-small font-semibold">
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${live ? "bg-ink" : "border border-dashed border-ink-muted"}`} />
        {title}
      </p>
      <p className="mt-1 text-small text-ink-secondary">{children}</p>
    </li>
  );
}

/** A stage of the work order: its own dashed card on a phone, a column of the one dashed sheet from 768 px. */
function Stage({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="min-w-0 border-dashed border-border-strong px-5 py-4 max-md:rounded-sheet max-md:border max-md:bg-surface md:not-first:border-l md:px-6 md:py-(--screen-gap-md) lg:not-compact:py-(--screen-gap)">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-control border border-dashed border-border-strong text-small font-bold text-ink-secondary tabular-nums"
        >
          {n}
        </span>
        <h3 className="text-h3 font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-small text-ink-secondary">{body}</p>
    </li>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-0.5">
      <dt className="text-ink-secondary">{term}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
