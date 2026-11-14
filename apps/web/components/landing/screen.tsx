import type { ReactNode } from "react";

export type ScreenTone = "canvas" | "paper" | "log";

const TONE: Record<ScreenTone, string> = {
  canvas: "bg-canvas",
  paper: "border-y border-border bg-surface",
  log: "screen-log border-y border-border bg-log text-log-ink",
};

/**
 * One landing section, one screen (docs/DESIGN.md 7.3): at least the room under the sticky header with no upper
 * limit, the content centred in it. Its type, spacing and width come from the landing's fluid scale (app/landing.css),
 * so they shrink on a short laptop or a phone and grow on a big monitor, without a jump at any width. The Next link
 * hangs from the bottom edge of the room and shows only while the content leaves it that space, so it's never cut by
 * the fold.
 */
export function Screen({
  id,
  titleId,
  tone = "canvas",
  next,
  bleed = false,
  children,
}: {
  id?: string;
  titleId: string;
  tone?: ScreenTone;
  next?: { href: string; label: string };
  /** On a phone the last block runs to the section's bottom edge, for a band that closes the page. */
  bleed?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={titleId} data-next={next ? "" : undefined} data-bleed={bleed ? "" : undefined} className={`screen ${TONE[tone]}`}>
      <div className="screen-frame">
        <div className="screen-body">{children}</div>
        {next && (
          <div className="screen-next-zone">
            <NextLink href={next.href} tone={tone}>
              {next.label}
            </NextLink>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * The section's place on the page, drawn as a graphite pin like the numbered pins on a reviewer's sentences.
 * Graphite because it marks location, never a result. It sizes itself from the section heading it sits in.
 */
export function ScreenPin({ n, tone = "canvas" }: { n: number; tone?: ScreenTone }) {
  const fill = tone === "log" ? "bg-log-strong text-on-open" : "bg-ink text-on-action";
  return (
    <span aria-hidden className={`screen-pin grid shrink-0 place-items-center rounded-full text-small font-bold tabular-nums ${fill}`}>
      {n}
    </span>
  );
}

/**
 * The heading row's grid: the heading beside its lead from 1024 px. On a big screen, where the heading has reached its
 * full size, the heading's column widens so a two-sentence heading keeps to two lines.
 */
export const SCREEN_HEADING_GRID = "grid gap-x-12 gap-y-(--screen-gap-md) lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:not-compact:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]";

/** The section's heading on the left with its pin, and one short lead on the right, meeting on a shared baseline. */
export function ScreenHeading({ n, titleId, title, lead, tone = "canvas" }: { n: number; titleId: string; title: ReactNode; lead: ReactNode; tone?: ScreenTone }) {
  return (
    <div className={`${SCREEN_HEADING_GRID} lg:items-end`}>
      <h2 id={titleId} className={`flex items-start gap-3.5 text-section font-semibold text-balance lg:gap-4 ${tone === "log" ? "text-log-strong" : ""}`}>
        <ScreenPin n={n} tone={tone} />
        <span className="min-w-0">{title}</span>
      </h2>
      <p className={`max-w-(--screen-measure) text-lead text-pretty lg:pb-1 ${tone === "log" ? "text-log-ink" : "text-ink-secondary"}`}>{lead}</p>
    </div>
  );
}

function NextLink({ href, tone, children }: { href: string; tone: ScreenTone; children: ReactNode }) {
  const color = tone === "log" ? "text-log-ink hover:text-log-strong" : "text-ink-secondary hover:text-ink";
  const ring = tone === "log" ? "border-log-muted" : "border-border-strong";
  return (
    <p className="screen-next">
      <a href={href} className={`group inline-flex min-h-(--screen-next-h) items-center gap-3 text-small font-medium ${color}`}>
        <span aria-hidden className={`grid size-7 place-items-center rounded-full border ${ring} transition-transform duration-(--duration-fast) group-hover:translate-y-0.5 motion-reduce:transition-none`}>
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6.5 8 10.5 12 6.5" />
          </svg>
        </span>
        <span>Next: {children}</span>
      </a>
    </p>
  );
}
