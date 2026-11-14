import Link from "next/link";
import { CommentCard, type CommentMark } from "@/components/comment-card";
import { PunchTag, tagFor } from "@/components/tag";
import { UrlForm } from "@/components/url-form";
import { day, duration, sha7 } from "@/lib/format";
import type { CommandResult, MilestoneView } from "@/lib/queries";
import { focusNote, paragraphEnd, type Showcase } from "./facts";
import { Fold } from "./fold";
import { Screen } from "./screen";

const FOR_WHOM = "For grant teams whose milestone payment is waiting on a review.";
const HOW_IT_CHECKS =
  "UNSTUCK runs a check for each ask you pick on the last commit before the review, and tags it Still missing, Works or Not sure, with the line that decided it. Paste your fix and it reruns the same checks on it.";

/**
 * A phone shorter than this can't hold the whole lead above the link field, so there the lead keeps its first sentence
 * and the rest opens with the scene under How it checks. Both rules are whole class names, so Tailwind finds them.
 */
const LEAD_REST_INLINE = "max-md:[@media(max-height:43rem)]:hidden";
const LEAD_REST_FOLDED = "hidden max-md:[@media(max-height:43rem)]:block";

/**
 * The scene gets the room the frame leaves it and crops the comment, from the top, into what's left after the check
 * slip. From 1024 px it stands beside the headline, and on a screen taller than 760 px it also leaves the Next link its
 * space. From 768 px it sits under the two-line headline. Below 768 px it's folded, and an opened fold shows it whole
 * with the comment cut to its last lines on phones.
 */
const SCENE_HEIGHT = [
  "[--hero-room:calc(var(--landing-room)-var(--screen-pt)-var(--screen-pb))]",
  "md:max-lg:max-h-[calc(var(--hero-room)-var(--text-display)*var(--text-display--line-height)*2-var(--screen-gap-md))]",
  "lg:short:max-h-(--hero-room)",
  "lg:not-short:max-h-[calc(var(--hero-room)-var(--screen-next-gap)-var(--screen-next-h))]",
].join(" ");

/**
 * On phones the opened comment shows its last lines, where the checked words sit. It's always cut there, so its fade can
 * run past the padding into the text.
 */
const PHONE_CROP = "max-sm:[&>div>blockquote]:max-h-60 max-sm:[&>div>blockquote]:[mask-image:linear-gradient(to_bottom,transparent_0.75rem,black_4.5rem)]";

export function Hero({ view, show }: { view: MilestoneView | undefined; show: Showcase | null }) {
  return (
    <Screen titleId="hero-title" next={{ href: "#problem", label: "Why payments stall" }}>
      <div className="grid gap-(--screen-gap-md) md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-x-(--screen-gap) lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
        {/* From 768 to 1023 px the headline spans both columns, so the pitch is a contents box there; from 1024 px it's the left column. */}
        <div className="contents lg:block lg:min-w-0">
          <h1 id="hero-title" className="text-display font-semibold text-balance md:col-span-2">
            See what your reviewer is still waiting for.
          </h1>
          <div className="min-w-0 lg:mt-(--screen-gap-md)">
            <p className="max-w-(--screen-measure) text-lead text-pretty text-ink-secondary">
              {FOR_WHOM}
              <span className={LEAD_REST_INLINE}> {HOW_IT_CHECKS}</span>
            </p>
            <div className="mt-(--screen-gap) max-w-144">
              <UrlForm id="hero-url" fit />
            </div>
            {show && <Example show={show} className="mt-(--screen-gap-sm) max-md:hidden" />}
          </div>
        </div>
        <Fold label="How it checks" until="md" className="min-w-0 md:col-start-2 md:row-start-2 lg:row-start-1">
          <div className="grid gap-(--screen-gap-md)">
            <p className={`${LEAD_REST_FOLDED} text-lead text-pretty text-ink-secondary`}>{HOW_IT_CHECKS}</p>
            {show && <Example show={show} className="md:hidden" />}
            {view && show ? <HeroScene view={view} show={show} /> : <EmptyScene />}
          </div>
        </Fold>
      </div>
    </Screen>
  );
}

function Example({ show, className }: { show: Showcase; className: string }) {
  return (
    <p className={`text-small text-ink-secondary ${className}`}>
      <Link
        href={`/m/${show.milestoneId}`}
        className="-my-3 inline-block py-3 font-semibold text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
      >
        See a real example
      </Link>{" "}
      from the {show.program}
      {show.thread && (
        <>
          , <span className="whitespace-nowrap">{`${show.thread.kind.toLowerCase()} #${show.thread.number}`}</span>
        </>
      )}
    </p>
  );
}

/**
 * The reviewer's comment with the words the check tests struck and pinned, the tag the run gave hung off the sheet,
 * and the check itself clipped under it. Only the checked words carry the stroke, so the pin sits where the check
 * looks; the caption says the ask is the whole sentence, so the untested part isn't hidden. The comment shows
 * everything up to the end of the decided ask, so the card ends on the sentence its caption names, and a crop keeps
 * its last lines; On GitHub links to all of it.
 */
function HeroScene({ view, show }: { view: MilestoneView; show: Showcase }) {
  const { milestone, asks } = view;
  const body = milestone.reviewerCommentBody ?? "";
  const verdict = show.ask ? tagFor(show.ask.verdict) : null;
  const marks: CommentMark[] =
    show.focusSpan && verdict
      ? [{ ...show.focusSpan, verdict, n: show.askNumber }]
      : asks
          .filter((ask) => ask.quoteStart !== null)
          .map((ask, i) => ({ start: ask.quoteStart ?? 0, length: ask.quote.length, verdict: tagFor(ask.verdict), n: i + 1 }));
  const askStart = show.ask?.quoteStart;
  const askEnd = show.focusSpan && show.ask && typeof askStart === "number" ? askStart + show.ask.quote.length : null;
  const shown = body.slice(0, askEnd ?? paragraphEnd(body, Math.max(0, ...marks.map((m) => m.start + m.length)))).trimEnd();

  return (
    <div className={`stage flex min-w-0 flex-col rounded-stage px-(--screen-gap-md) pt-8 pb-(--screen-gap-md) ${SCENE_HEIGHT}`}>
      <div className="relative flex min-h-0 flex-col">
        <CommentCard
          author={show.reviewer}
          createdAt={milestone.reviewerCommentAt}
          url={show.commentUrl}
          body={shown}
          marks={marks}
          source={`${show.program}${show.thread ? `, ${show.thread.kind.toLowerCase()} #${show.thread.number}` : ""}`}
          caption={(show.focusSpan && show.ask && focusNote(show.ask, show.focus, show.askNumber)) || undefined}
          preview
          crop
          className={`${PHONE_CROP} sm:[&>figcaption]:pb-6`}
        />
        {(verdict === "missing" || verdict === "works") && (
          <span className="pointer-events-none absolute -top-8 right-3 sm:right-10">
            <span className="hung-tag">
              <PunchTag verdict={verdict} size="lg" n={show.askNumber} />
            </span>
          </span>
        )}
      </div>
      {show.check && <CheckSlip check={show.check} show={show} sha={milestone.pinnedSha} line={show.ask?.failure?.line ?? null} />}
    </div>
  );
}

/**
 * The one command that decided the ask, clipped under the comment like a receipt: the commit it ran on, the command,
 * the line it printed, and what it can't see. The command shows whole on a wide, tall screen and is cut to two or
 * three lines elsewhere, its whole text in the title and the run record.
 */
function CheckSlip({ check, show, sha, line }: { check: CommandResult; show: Showcase; sha: string | null; line: string | null }) {
  const passed = check.exitCode === 0 && check.timedOut !== 1;
  return (
    <div className="relative z-10 mt-3 ml-4 shrink-0 rounded-sheet bg-log px-4 py-3.5 text-log-ink shadow-sheet sm:-mt-4 sm:ml-8 sm:px-5">
      <p className="text-small text-log-muted">
        <span className="font-semibold text-log-strong">The check for ask {show.askNumber}</span> at{" "}
        <span className="font-mono text-log-strong" title={sha ?? undefined}>
          {sha7(sha)}
        </span>
        , the last commit before the review
      </p>
      <p
        className="mt-2.5 font-mono log-type wrap-anywhere text-log-muted max-sm:line-clamp-2 md:max-xl:not-short:line-clamp-3 md:short:line-clamp-2"
        title={check.command}
      >
        $ {check.command}
      </p>
      {line && !passed && <p className="mt-1.5 font-mono log-type wrap-anywhere text-log-fail">{line}</p>}
      <p className="mt-1.5 text-small text-log-muted">
        <span className={`font-mono log-type ${passed ? "text-log-pass" : "text-log-fail"}`}>{check.timedOut === 1 ? "timeout" : `exit ${check.exitCode ?? "?"}`}</span>
        <span>
          {" "}
          with the network {check.network === "none" ? "off" : "on"}, in {duration(check.durationMs)}
          {show.ranAt ? `, on ${day(show.ranAt)}` : ""}
        </span>
      </p>
      {show.checkScope && <p className="mt-2 text-small text-pretty text-log-ink">{show.checkScope}</p>}
      {show.runId && (
        <Link href={`/runs/${show.runId}`} className="mt-1 inline-flex min-h-11 items-center text-small font-semibold text-log-strong underline underline-offset-4">
          Open the run record
        </Link>
      )}
    </div>
  );
}

function EmptyScene() {
  return (
    <div className="stage rounded-stage p-6 sm:p-10">
      <p className="max-w-128 rounded-sheet border border-dashed border-border-strong bg-surface p-6 text-ink-secondary">
        No recorded run to show yet. Paste a comment and its run record appears here.
      </p>
    </div>
  );
}
