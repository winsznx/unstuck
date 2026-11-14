import { UrlForm } from "@/components/url-form";
import { SCREEN_HEADING_GRID, Screen, ScreenPin } from "./screen";

const LEAD = "What it can't do yet, what gets published and what it costs.";

/**
 * These decide whether someone pastes a link, so every answer stays open wherever the screen holds all six with the
 * closing band, and at most one tap away elsewhere: one question per tap on tablets and short laptops, and the six
 * together behind the lead on phones, where the band takes most of the screen.
 */
const QUESTIONS = [
  {
    q: "Can I check my fix commit?",
    a: "Yes. Paste its pull request, commit link or SHA. UNSTUCK applies it to the reviewed commit, reruns the same checks and marks each ask Fixed or not.",
  },
  {
    q: "My review is a file in the PR. Does that work?",
    a: "Not yet. Any program that reviews on public GitHub works if the asks are in a comment. Linked evaluation files, common at Web3 Foundation, aren't read yet.",
  },
  {
    q: "My reviewer's comment is vague. Will this help?",
    a: "Only where a sentence can become a check. If one asks for nothing you can test, leave it out or let it stay Not sure, and ask your reviewer what they need.",
  },
  {
    q: "Can I delete or unlist a run?",
    a: "No. Every run is listed under Recorded runs, and your milestone gets its own page, both at permanent links. Nothing runs until you start it.",
  },
  {
    q: "I'm a reviewer. Why would I trust this?",
    a: "Read the record, not the tag. A pass means one command exited 0 on one commit. Each command sits beside the words it checks, so a sentence of yours that isn't there had no check.",
  },
  {
    q: "What does it cost?",
    a: "Reading the comment and rerunning the checks are free. Hiring isn't switched on, so nothing can be charged today.",
  },
] as const;

/*
 * Where all six answers show open: from 640 px wide on a tablet taller than 1024 px, and from 1024 px wide on a screen
 * taller than 760 px. Elsewhere at those widths they're an accordion, and below 640 px they fold behind the lead.
 */
const OPEN = "max-sm:hidden sm:max-lg:[@media(max-height:64rem)]:hidden lg:short:hidden";
const ACCORDION = "hidden sm:max-lg:[@media(max-height:64rem)]:grid lg:short:grid";

/**
 * The heading is ScreenHeading's, laid out here because on a phone its lead is the summary the answers fold under.
 */
export function Questions() {
  return (
    <Screen id="questions" titleId="questions-title" bleed>
      <div className={`${SCREEN_HEADING_GRID} lg:items-end`}>
        <h2 id="questions-title" className="flex items-start gap-3.5 text-section font-semibold text-balance lg:gap-4">
          <ScreenPin n={6} />
          <span className="min-w-0">Before you paste a link</span>
        </h2>
        <p className="max-w-(--screen-measure) text-lead text-pretty text-ink-secondary max-sm:hidden lg:pb-1">{LEAD}</p>
        <details className="fold rounded-sheet border border-border bg-surface-muted px-(--screen-gap-md) sm:hidden">
          <summary className="w-full justify-between py-(--screen-gap-sm) text-pretty">{LEAD}</summary>
          <Answers className="pb-(--screen-gap-md)" />
        </details>
      </div>
      <Answers className={`${OPEN} sm:grid-cols-2`} />
      <div className={`${ACCORDION} gap-x-12 lg:grid-cols-2`}>
        {QUESTIONS.map(({ q, a }) => (
          <details key={q} name="questions" className="fold min-w-0 border-t border-border">
            <summary className="w-full justify-between py-1.5">{q}</summary>
            <p className="max-w-160 pb-(--screen-gap-sm) text-body text-ink-secondary">{a}</p>
          </details>
        ))}
      </div>
      <div className="stage rounded-stage px-(--screen-gutter) py-(--screen-gap-md) max-sm:-mx-(--screen-gutter) max-sm:flex max-sm:flex-1 max-sm:flex-col max-sm:justify-center max-sm:py-(--screen-gap) max-sm:rounded-none sm:px-10 lg:px-12">
        <div className="grid gap-(--screen-gap-md) lg:grid-cols-2 lg:items-center lg:gap-x-12">
          <h2 className="text-section font-semibold">
            <span className="block text-balance">Paste the comment.</span> <span className="block text-balance">See what it still needs.</span>
          </h2>
          <UrlForm id="cta-url" tone="stage" fit />
        </div>
      </div>
    </Screen>
  );
}

function Answers({ className }: { className: string }) {
  return (
    <dl className={`grid gap-x-12 gap-y-(--screen-gap-md) ${className}`}>
      {QUESTIONS.map(({ q, a }) => (
        <div key={q} className="min-w-0 border-t border-border pt-3">
          <dt className="text-h3 font-semibold">{q}</dt>
          <dd className="mt-1 max-w-160 text-body text-ink-secondary">{a}</dd>
        </div>
      ))}
    </dl>
  );
}
