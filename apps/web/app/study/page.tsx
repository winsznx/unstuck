import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/button";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Figure, VerdictBar } from "@/components/study/figures";
import { PageHead, SectionHead } from "@/components/study/page-head";
import { PunchTag } from "@/components/tag";
import { day, duration, plural, repoName, sha7 } from "@/lib/format";
import { buildStudy, type ReviewRow, type Study } from "@/lib/study";
import { loadStudyInput } from "@/lib/study-data";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Study of grant milestone reviews",
  description: "What still fails when public grant milestone reviews are rerun on the commit the reviewer saw.",
  path: "/study",
});

/** Below this many reviews the page says plainly that it is reporting counts, not rates. */
const EARLY = 10;

const METHOD: { title: string; body: string }[] = [
  {
    title: "Find a review that holds a payment",
    body: "Public GitHub threads where a program's reviewer left open items on a milestone delivery. Canton Dev Fund issues and Web3 Foundation delivery pull requests so far.",
  },
  {
    title: "Pin the commit the reviewer saw",
    body: "The latest commit on the code repo at the time of the comment, or the pull request's head when the code lives in the thread itself. Never today's main.",
  },
  {
    title: "Take the asks word for word",
    body: "Each ask is a sentence from the reviewer's comment, stored with its position and checked against GitHub again before it's saved. Nothing is paraphrased.",
  },
  {
    title: "Rerun in a sealed container",
    body: "A fresh clone at that commit, network off for the checks, read-only filesystem, capped CPU, memory and time. Every exit code and a SHA-256 of every output is stored.",
  },
  {
    title: "Tag each ask from its exit codes",
    body: "Still missing if any of its checks fails or runs out of time. Works if all of them exit 0. Not sure if no check covers it or one didn't run.",
  },
];

const RULES: { counted: boolean; title: string; body: string }[] = [
  { counted: true, title: "Each reviewer comment once", body: "Opening the same comment again adds a run, not a review. Its verdicts come from its latest finished rerun." },
  { counted: true, title: "Every check that ran", body: "Step totals count every check in every finished run, repeats included, because each one really executed." },
  { counted: false, title: "Runs that couldn't start", body: "A failed checkout is an error. It never turns an ask into Still missing." },
  { counted: false, title: "The grantee's own delivery notes", body: "Only comments from the program's reviewers are read as asks." },
  { counted: false, title: "Threads already approved or paid", body: "Nothing is left to close on them, so they aren't picked." },
  { counted: false, title: "Private repos and closed code", body: "If a reviewer could only check it privately, so can't anyone else." },
];

export default async function StudyPage() {
  const study = buildStudy(await loadStudyInput());
  const reviews = study.reviews.length;
  const failedChecks = study.steps.failed + study.steps.timedOut;

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="pb-8">
        <PageHead
          title="What still fails when a review is rerun"
          lead="Every number here is read from the stored runs when you open the page. Each one keeps its denominator, and every review links to the run record behind it."
          aside={reviews < EARLY ? <EarlyNote reviews={reviews} /> : undefined}
        />

        <section aria-label="Headline counts" className="mx-auto mt-12 max-w-(--container-content) px-2 sm:px-6">
          <div className="stage rounded-stage p-2 sm:p-4">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sheet border border-border bg-border shadow-object lg:grid-cols-4">
              <Figure value={study.verdicts.missing} of={study.asks}>
                asks still missing at the commit the reviewer saw
              </Figure>
              <Figure value={failedChecks} of={study.steps.ran}>
                checks failed or ran out of time
              </Figure>
              <Figure value={reviews} unit={reviews === 1 ? "review" : "reviews"}>
                read across {plural(study.programs.length, "program", "programs")}, opened {plural(study.milestones, "time", "times")}
              </Figure>
              <Figure value={study.medianDaysToRerun ?? "None"} unit={study.medianDaysToRerun === null ? undefined : study.medianDaysToRerun === 1 ? "day" : "days"}>
                {study.medianDaysToRerun === null ? "reviews with a dated comment and a finished rerun" : "median from the reviewer's comment to our rerun"}
              </Figure>
            </div>
            <div className="mt-2 rounded-sheet border border-border bg-surface p-5 sm:mt-4 sm:p-6">
              <p className="text-h3 font-semibold">Where every ask landed</p>
              <p className="mt-1 text-small text-ink-secondary">One count per ask, from the latest finished rerun of its review.</p>
              <div className="mt-5">
                <VerdictBar tally={study.verdicts} caption="Asks by verdict" />
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="reviews-title" className="mx-auto max-w-(--container-content) px-4 pt-20 sm:px-6 lg:pt-28">
          <SectionHead
            id="reviews-title"
            title="Every review counted"
            lead="Newest review first. Each row is one reviewer comment and the run that decided it."
            aside={<ButtonLink href="/runs" variant="secondary">All recorded runs</ButtonLink>}
          />
          {reviews === 0 ? (
            <div className="mt-10 rounded-sheet border border-dashed border-border-strong bg-surface p-8 text-center">
              <p className="text-h3 font-semibold">No reviews rerun yet</p>
              <p className="mt-2 text-body text-ink-secondary">The first milestone you start shows up here once its rerun finishes.</p>
              <ButtonLink href="/start" className="mt-5">
                Start a milestone
              </ButtonLink>
            </div>
          ) : (
            <ol className="mt-10 overflow-hidden rounded-sheet border border-border bg-surface">
              {study.reviews.map((review) => (
                <ReviewItem key={review.key} review={review} />
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="runs-title" className="mx-auto max-w-(--container-content) px-4 pt-20 sm:px-6 lg:pt-28">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
            <SectionHead className="self-start" id="runs-title" title="The runs underneath" lead="Every rerun, including repeats and ones that stopped early. These are runs, not reviews." />
            <RunTotals study={study} />
          </div>
          {study.programs.length > 0 && <ProgramTable study={study} />}
        </section>

        <section id="method" aria-labelledby="method-title" className="mx-auto max-w-(--container-content) scroll-mt-20 px-4 pt-20 sm:px-6 lg:pt-28">
          <SectionHead id="method-title" title="How a review is counted" lead="The same five steps run for every review on this page, in this order." />
          <ol className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-sheet border border-border bg-border md:grid-cols-5">
            {METHOD.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-3 bg-surface p-5 sm:p-6">
                <span aria-hidden className="grid size-8 place-items-center rounded-full border border-ink text-small font-bold tabular-nums">
                  {i + 1}
                </span>
                <h3 className="text-h3 font-semibold">{step.title}</h3>
                <p className="text-small text-ink-secondary">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <RuleList title="Counted" rules={RULES.filter((r) => r.counted)} />
            <RuleList title="Left out" rules={RULES.filter((r) => !r.counted)} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function EarlyNote({ reviews }: { reviews: number }) {
  return (
    <div className="rounded-panel border border-open-edge/40 bg-open-soft p-4">
      <PunchTag verdict="open">Early count</PunchTag>
      <p className="mt-2.5 text-small text-ink">
        {plural(reviews, "review", "reviews")} so far. Read these as counts with their denominators, not as rates for every program.
      </p>
    </div>
  );
}

function ReviewItem({ review }: { review: ReviewRow }) {
  const { verdicts } = review;
  return (
    <li className="grid grid-cols-1 gap-4 border-border px-5 py-5 not-first:border-t sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-8">
      <div className="min-w-0">
        <p className="text-small text-ink-muted">{review.program}</p>
        <a className="mt-0.5 block text-h3 font-semibold wrap-anywhere underline-offset-4 hover:underline" href={review.commentUrl ?? review.threadUrl} rel="nofollow noreferrer">
          {review.threadTitle ?? repoName(review.threadUrl.replace(/\/(issues|pull)\/\d+.*$/, ""))}
        </a>
        <p className="mt-1 text-small text-ink-secondary">
          {review.reviewer ?? "A reviewer"}
          {review.reviewedAt ? `, ${day(review.reviewedAt)}` : ", date not recorded"}
          {review.attempts > 1 ? `. Opened ${review.attempts} times, counted once.` : ""}
        </p>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-small">
        <dt className="text-ink-muted">Code</dt>
        <dd className="flex min-w-0 gap-1.5 font-mono log-type">
          <span className="shrink-0">{sha7(review.sha)}</span>
          <span className="min-w-0 truncate text-ink-secondary">{repoName(review.codeRepoUrl)}</span>
        </dd>
        <dt className="text-ink-muted">Rerun</dt>
        <dd>
          {review.firstRerunAt ? day(review.firstRerunAt) : "Not finished"}
          {review.daysToRerun !== null && <span className="text-ink-muted">{`, ${plural(review.daysToRerun, "day", "days")} after`}</span>}
        </dd>
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        {review.asks === 0 ? (
          <span className="text-small text-ink-muted">No asks picked</span>
        ) : (
          <>
            {verdicts.missing > 0 && <PunchTag verdict="missing">{`${verdicts.missing} still missing`}</PunchTag>}
            {verdicts.works > 0 && <PunchTag verdict="works">{`${verdicts.works} works`}</PunchTag>}
            {verdicts.unsure > 0 && <PunchTag verdict="unsure">{`${verdicts.unsure} not sure`}</PunchTag>}
          </>
        )}
      </div>
      <div className="flex gap-4 text-small font-medium lg:flex-col lg:items-end lg:gap-1">
        {review.replayId && (
          <Link className="underline underline-offset-4 hover:text-ink-secondary" href={`/runs/${review.replayId}`}>
            Run record
          </Link>
        )}
        <Link className="text-ink-secondary underline-offset-4 hover:text-ink hover:underline" href={`/m/${review.milestoneId}`}>
          Milestone
        </Link>
      </div>
    </li>
  );
}

function RunTotals({ study }: { study: Study }) {
  const { replays, steps } = study;
  const rows: [string, ReactNode][] = [
    ["Reruns started", replays.total],
    ["Finished", <Of key="f" n={replays.finished} of={replays.total} />],
    ["Couldn't start or stopped with an error", <Of key="e" n={replays.error} of={replays.total} />],
    ["Still queued or running", replays.live],
    ["Reruns on a fix", replays.patch === 0 ? "None yet" : replays.patch],
    ["Checks that ran", steps.ran],
    ["Exited 0", <Of key="p" n={steps.passed} of={steps.ran} />],
    ["Exited non-zero", <Of key="x" n={steps.failed} of={steps.ran} />],
    ["Ran out of time", <Of key="t" n={steps.timedOut} of={steps.ran} />],
    ["Median time per check", study.medianStepMs === null ? "None yet" : duration(study.medianStepMs)],
  ];
  return (
    <dl className="divide-y divide-border rounded-sheet border border-border bg-surface px-5 sm:px-6">
      {rows.map(([term, value]) => (
        <div key={term} className="flex items-baseline justify-between gap-6 py-3">
          <dt className="text-small text-ink-secondary">{term}</dt>
          <dd className="text-body font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const Of = ({ n, of }: { n: number; of: number }) => (
  <>
    {n} <span className="font-normal text-ink-muted">of {of}</span>
  </>
);

function ProgramTable({ study }: { study: Study }) {
  return (
    <div className="mt-10 overflow-x-auto rounded-sheet border border-border bg-surface">
      <table className="w-full text-left text-small">
        <caption className="px-5 pt-5 text-left text-h3 font-semibold sm:px-6">By program</caption>
        <thead>
          <tr className="border-b border-border text-ink-muted">
            <th scope="col" className="px-5 py-3 font-medium sm:px-6">
              Program
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Reviews
            </th>
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Asks
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium sm:px-6">
              Still missing
            </th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {study.programs.map((p) => (
            <tr key={p.program} className="border-border not-last:border-b">
              <th scope="row" className="px-5 py-3 font-semibold sm:px-6">
                {p.program}
              </th>
              <td className="px-3 py-3 text-right">{p.reviews}</td>
              <td className="px-3 py-3 text-right">{p.asks}</td>
              <td className="px-5 py-3 text-right sm:px-6">
                {p.missing} <span className="text-ink-muted">of {p.asks}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RuleList({ title, rules }: { title: string; rules: typeof RULES }) {
  return (
    <div className="rounded-sheet border border-border bg-surface p-5 sm:p-6">
      <h3 className="text-h3 font-semibold">{title}</h3>
      <ul className="mt-4 space-y-4">
        {rules.map((rule) => (
          <li key={rule.title} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3">
            <span aria-hidden className={`mt-1.5 size-2.5 rounded-full ${rule.counted ? "bg-ink" : "border border-ink-muted"}`} />
            <div>
              <p className="text-body font-semibold">{rule.title}</p>
              <p className="mt-0.5 text-small text-ink-secondary">{rule.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
