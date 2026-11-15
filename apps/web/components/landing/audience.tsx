import { Rail } from "./rail";
import { Screen, ScreenPin } from "./screen";

const TERMS = [
  { term: "You bring", detail: "The public GitHub issue or PR with your reviewer's comment." },
  { term: "You decide", detail: "Which sentences are asks, which checks run, and what gets posted." },
  { term: "You get today", detail: "A tag on each ask you picked, with a public run record that shows each check's exact command beside the words it checks." },
  { term: "It reads", detail: "Public GitHub threads and repos. A run's install step also downloads the packages it names." },
] as const;

const WONT_TITLE = "What UNSTUCK won't do";

const WONT = [
  { title: "Make your funder pay", body: "It works through your reviewer's asks. Approval and payment stay with your program." },
  { title: "Post for you", body: "Nothing goes on your thread or repo unless you post it." },
  { title: "Reword your reviewer", body: "Each ask is a word-for-word span of their comment, checked against GitHub before it's saved. The record links to the whole comment." },
  {
    title: "Call something fixed on trust",
    body: "Works only means its check exited 0. The record shows the exact command, so your reviewer judges whether it tests what they asked.",
  },
  { title: "Spend past your limit", body: "Every hire is checked against the spending limit you set first." },
] as const;

/**
 * On a phone the terms swipe, and the limits fold under their heading, or on a phone 720 px tall or more, show a row
 * each with the reason one tap away. From 640 px up everything reads in full, the limits in two columns on a tablet.
 */
export function Audience() {
  return (
    <Screen id="limits" titleId="who-title" tone="paper" next={{ href: "#questions", label: "Questions" }}>
      <div className="grid gap-(--screen-gap) tight:gap-(--screen-gap-md) lg:grid-cols-2 lg:items-center lg:gap-x-16 xl:not-compact:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="flex min-w-0 flex-col gap-(--screen-gap) tight:gap-(--screen-gap-md)">
          <div className="flex flex-col gap-(--screen-gap-md)">
            <h2 id="who-title" className="flex items-start gap-3.5 text-section font-semibold text-balance lg:gap-4">
              <ScreenPin n={5} />
              <span className="min-w-0">UNSTUCK is for grantees waiting on a review.</span>
            </h2>
            <p className="max-w-(--screen-measure) text-lead text-pretty text-ink-secondary">
              You&apos;ve delivered the milestone, a reviewer listed what&apos;s still open on public GitHub, and those items are what&apos;s left before
              acceptance.
            </p>
          </div>
          <Rail label="What you bring, decide and get" until="sm" as="dl" className="gap-x-8 gap-y-(--screen-gap-md) sm:grid-cols-2">
            {TERMS.map((item) => (
              <div key={item.term} className="border-t border-border pt-3 max-sm:rounded-panel max-sm:border max-sm:bg-surface-muted max-sm:p-3">
                <dt className="text-small font-semibold text-ink-secondary">{item.term}</dt>
                <dd className="mt-1 text-body">{item.detail}</dd>
              </div>
            ))}
          </Rail>
        </div>
        <div className="min-w-0 rounded-sheet border border-border bg-surface-muted px-(--screen-gap-md) py-(--screen-gap-sm) sm:p-(--screen-gap-md) lg:p-(--screen-gap)">
          <h3 className="text-h2 font-semibold max-sm:[@media(height<45rem)]:hidden">{WONT_TITLE}</h3>
          <details className="fold hidden max-sm:[@media(height<45rem)]:block">
            <summary>{WONT_TITLE}</summary>
            <WontList />
          </details>
          <div className="mt-(--screen-gap-sm) hidden max-sm:[@media(height>=45rem)]:block">
            {WONT.map((item) => (
              <details key={item.title} name="wont" className="fold border-t border-border">
                <summary className="w-full gap-3.5">
                  <XMark />
                  <span className="min-w-0 flex-1">{item.title}</span>
                </summary>
                <p className="pb-(--screen-gap-sm) pl-9.5 text-small text-ink-secondary">{item.body}</p>
              </details>
            ))}
          </div>
          <WontList className="max-sm:hidden" />
        </div>
      </div>
    </Screen>
  );
}

function WontList({ className = "" }: { className?: string }) {
  return (
    <ul className={`mt-(--screen-gap-sm) grid gap-x-(--screen-gap) md:max-lg:grid-cols-2 ${className}`}>
      {WONT.map((item) => (
        <li key={item.title} className="flex gap-3.5 border-t border-border py-(--screen-gap-sm) lg:not-compact:py-(--screen-gap-md)">
          <XMark className="mt-0.5" />
          <span className="min-w-0">
            <span className="block font-semibold">{item.title}</span>
            <span className="mt-0.5 block text-small text-ink-secondary">{item.body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function XMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full border border-border-strong bg-surface text-ink-secondary ${className}`}>
      <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M3 3l6 6M9 3l-6 6" />
      </svg>
    </span>
  );
}
