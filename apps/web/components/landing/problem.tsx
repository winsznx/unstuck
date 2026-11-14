import Link from "next/link";
import { day, plural } from "@/lib/format";
import { calendarDays, type StudyFacts } from "./facts";
import { PUBLIC_REVIEW } from "./public-review";
import { Rail } from "./rail";
import { Screen, ScreenHeading } from "./screen";

const CAUSES = [
  {
    title: "The asks are prose",
    body: "A reviewer describes what's missing in sentences, sometimes in a separate file. There's no check you can run.",
  },
  {
    title: "The code has moved",
    body: "They reviewed one commit, and your branch has moved since. Green CI on main doesn't show their specific asks are met.",
  },
] as const;

const CARD = "flex min-w-0 flex-col gap-(--screen-gap-sm) rounded-sheet p-(--screen-gap-md)";
/** The public review's cards share the ticket's grey; the causes and the study are notes on the paper beside it. */
const REVIEW_CARD = `${CARD} bg-surface-muted`;
const NOTE_CARD = `${CARD} border border-border`;

/**
 * On a phone and a short laptop the review and the notes beside it swipe as one row of cards, so the screen holds the
 * heading and one card, two from 768 px. A portrait tablet 1024 px tall has the height for them as a two-column grid. From xl they're three columns read
 * down each: the ticket and its quote, the evaluation and its failing run, then the causes and the study. The ticket,
 * the evaluation and the causes span two rows.
 */
export function Problem({ study }: { study: StudyFacts | null }) {
  return (
    <Screen id="problem" titleId="problem-title" tone="paper" next={{ href: "#how", label: "How it works" }}>
      <ScreenHeading
        n={1}
        titleId="problem-title"
        title="Each missed ask costs another review round."
        lead="Your work is delivered, then a reviewer lists what's still open on the commit they looked at. You guess what will satisfy them, push a change and wait for another look."
      />
      <Rail
        label="One public review, and why rounds repeat"
        tall
        until="md"
        shortUntil="xl"
        className="gap-(--screen-gap-md) md:[--rail-item:calc((100cqi-2*var(--rail-inset)-3rem-var(--screen-gap-md))/2)] md:grid-cols-2 xl:grid-flow-col xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)] xl:grid-rows-[auto_auto_auto]"
      >
        <ReviewCards />
        <li className={`${NOTE_CARD} xl:row-span-2`}>
          <ul className="divide-y divide-border">
            {CAUSES.map((cause) => (
              <li key={cause.title} className="py-(--screen-gap-sm) first:pt-0 last:pb-0">
                <h3 className="text-h3 font-semibold">{cause.title}</h3>
                <p className="mt-1 text-small text-ink-secondary">{cause.body}</p>
              </li>
            ))}
          </ul>
        </li>
        {study && <StudyNote study={study} />}
      </Rail>
    </Screen>
  );
}

const listOf = (items: readonly string[]) => (items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"] as const;
const count = (n: number) => NUMBER_WORDS[n] ?? String(n);

/** The study's live counts in one sentence, with the way to every review behind them. */
function StudyNote({ study }: { study: StudyFacts }) {
  return (
    <li className={NOTE_CARD}>
      <h3 className="text-h3 font-semibold">The study so far</h3>
      <p className="text-small text-ink-secondary">
        {plural(study.reviews, "public milestone review", "public milestone reviews")} from {listOf(study.programs)}, rerun on the commit{" "}
        {study.reviews === 1 ? "its reviewer" : "each reviewer"} looked at: {plural(study.asks, "ask", "asks")}, {study.missing} still missing there.
      </p>
      <Link href="/study" className="mt-auto inline-flex min-h-11 items-center self-start text-small font-medium text-ink underline underline-offset-4 hover:decoration-ink">
        See every review in the study
      </Link>
    </li>
  );
}

type DayKind = "marked" | "waiting" | "after";

/** A day on the ticket: the three dated days punched through, the days before the first review greyed out. */
function DayDot({ kind, cx }: { kind: DayKind; cx: number }) {
  if (kind === "marked") return <circle cx={cx} cy={7} r={4.6} className="fill-ink" />;
  if (kind === "waiting") return <circle cx={cx} cy={7} r={2.3} className="fill-border-strong" />;
  return <circle cx={cx} cy={7} r={2.9} className="fill-surface stroke-ink-muted" strokeWidth={1.1} />;
}

function Legend({ kind, children }: { kind: DayKind; children: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg aria-hidden viewBox="0 0 10 14" className="h-3.5 w-2.5 shrink-0">
        <DayDot kind={kind} cx={5} />
      </svg>
      {children}
    </span>
  );
}

/**
 * One public review as four cards: the ticket, its headline over a punched hole for every day from delivery to
 * acceptance, the three days that mattered filled in and the days before the first review greyed out; one of the
 * evaluation's own asks, word for word; what the first evaluation asked for, with what UNSTUCK can't read yet; and the
 * run it records failing. Every date, quote and finding comes from PUBLIC_REVIEW.
 */
function ReviewCards() {
  const review = PUBLIC_REVIEW;
  const total = calendarDays(review.deliveredAt, review.acceptedAt);
  const firstReview = calendarDays(review.deliveredAt, review.firstReviewAt);
  const marks = [
    { day: 0, label: "Delivered", at: review.deliveredAt },
    { day: firstReview, label: "First review", at: review.firstReviewAt },
    { day: total, label: "Accepted", at: review.acceptedAt },
  ];
  const pitch = 10;
  const width = (total + 1) * pitch;
  const position = (d: number) => `${((d + 0.5) / (total + 1)) * 100}%`;
  const kindOf = (d: number): DayKind => (marks.some((m) => m.day === d) ? "marked" : d < firstReview ? "waiting" : "after");
  const later: number = review.laterReviewsAt.length;
  /* The ticket's days: in the headline's card, or on a phone under 600 px tall in a card of their own. */
  const timeline = (
    <>
      <svg viewBox={`0 0 ${width} 14`} className="block h-auto w-full" aria-hidden>
        {Array.from({ length: total + 1 }, (_, d) => (
          <DayDot key={d} kind={kindOf(d)} cx={d * pitch + pitch / 2} />
        ))}
      </svg>
      <ol className="relative mt-2 h-11 text-small">
        {marks.map((mark, i) => (
          <li
            key={mark.label}
            className={`absolute top-0 whitespace-nowrap ${i === 0 ? "" : i === marks.length - 1 ? "-translate-x-full text-right" : "-translate-x-1/2 text-center"}`}
            style={{ left: i === 0 ? 0 : i === marks.length - 1 ? "100%" : `max(${position(mark.day)}, calc(var(--spacing) * 30))` }}
          >
            <span className="block font-semibold">{mark.label}</span>
            <span className="block text-ink-secondary">{day(mark.at)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-small text-ink-secondary">
        <Legend kind="waiting">{`${firstReview} days to the first review`}</Legend>
        <Legend kind="after">{`${total - firstReview} days after it`}</Legend>
      </p>
    </>
  );

  return (
    <>
      <li className={`${REVIEW_CARD} xl:row-span-2`}>
        <div className="flex items-center justify-between gap-x-4">
          <h3 className="text-small font-semibold text-balance">
            {review.program}, {review.milestone}
          </h3>
          <a href={review.threadUrl} rel="nofollow noreferrer" className="inline-flex min-h-11 shrink-0 items-center text-small font-medium text-ink-secondary underline underline-offset-4 hover:text-ink">
            On GitHub<span className="sr-only">, the whole review thread</span>
          </a>
        </div>

        {/*
          On a phone the count fills the card at display size, at its foot where the ticket has a card of its own. On a
          short laptop the headline drops a size, where a second line would push the grid past the fold.
        */}
        <p className="text-h1 font-semibold max-md:tight:mt-auto xl:short:text-h2">
          <span className="tabular-nums max-md:block max-md:text-display max-md:leading-none">{total}</span> days from delivery to acceptance
        </p>

        <div className="mt-auto pt-(--screen-gap-sm) max-md:tight:hidden">{timeline}</div>
      </li>

      <li className={`${REVIEW_CARD} hidden justify-end max-md:tight:flex`}>
        <div>{timeline}</div>
      </li>

      <li className={REVIEW_CARD}>
        <blockquote cite={review.issue.url} className="border-l-2 border-border-strong pl-4">
          <p className="font-quote text-quote">
            “{review.issue.words[0]} … {review.issue.words[1]}”
          </p>
          <footer className="mt-1 text-small text-ink-secondary">
            {review.reviewer},{" "}
            <a href={review.issue.url} rel="nofollow noreferrer" className="underline underline-offset-4 hover:text-ink">
              issue {review.issue.number} of {review.outstanding.length}
            </a>{" "}
            in the first evaluation, {day(review.firstReviewAt)}
          </footer>
        </blockquote>
      </li>

      <li className={`${REVIEW_CARD} xl:row-span-2`}>
        <p className="text-small text-ink-secondary xl:not-short:text-body">
          The{" "}
          <a href={review.evaluationUrl} rel="nofollow noreferrer" className="underline underline-offset-4 hover:text-ink">
            first evaluation
          </a>{" "}
          marked it {review.status} over {count(review.outstanding.length)} issues: {review.outstanding.slice(0, -1).join(", ")} and {review.outstanding.at(-1)}.
          The asks were specific. Closing all {count(review.outstanding.length)} took another {total - firstReview} days and {count(later)} more{" "}
          {later === 1 ? "review" : "reviews"}.
        </p>
        <p className="mt-auto text-small text-ink-secondary">UNSTUCK reads asks written in the thread, not evaluation files like this one yet.</p>
      </li>

      <li className={REVIEW_CARD}>
        <div className="overflow-hidden rounded-panel bg-log font-mono log-type">
          <p className="border-b border-log-muted/30 px-4 py-1.5 font-sans text-small text-log-muted">
            From the evaluation: the reviewer&apos;s own run failed until they added a missing dependency.
          </p>
          <div className="px-4 py-2.5">
            <p className="text-log-muted">
              {review.repo} $ {review.command}
            </p>
            <p className="text-log-fail wrap-anywhere">{review.failure}</p>
          </div>
        </div>
      </li>
    </>
  );
}
