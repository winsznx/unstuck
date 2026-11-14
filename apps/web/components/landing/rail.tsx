import type { ReactNode } from "react";

export type RailBreakpoint = "sm" | "md" | "lg" | "xl";

/** Whole class names per breakpoint, so Tailwind finds every one of them in this file. */
const BELOW: Record<RailBreakpoint, { scroller: string; row: string; hint: string }> = {
  sm: { scroller: "max-sm:rail-scroll", row: "max-sm:rail-row", hint: "max-sm:rail-hint" },
  md: { scroller: "max-md:rail-scroll", row: "max-md:rail-row", hint: "max-md:rail-hint" },
  lg: { scroller: "max-lg:rail-scroll", row: "max-lg:rail-row", hint: "max-lg:rail-hint" },
  xl: { scroller: "max-xl:rail-scroll", row: "max-xl:rail-row", hint: "max-xl:rail-hint" },
};

/** The same, on a screen under 1024 px tall, for a rail that swipes on a laptop and is a grid on a tall tablet. */
const SHORT_BELOW: Record<RailBreakpoint, { scroller: string; row: string; hint: string }> = {
  sm: { scroller: "max-sm:[@media(height<64rem)]:rail-scroll", row: "max-sm:[@media(height<64rem)]:rail-row", hint: "max-sm:[@media(height<64rem)]:rail-hint" },
  md: { scroller: "max-md:[@media(height<64rem)]:rail-scroll", row: "max-md:[@media(height<64rem)]:rail-row", hint: "max-md:[@media(height<64rem)]:rail-hint" },
  lg: { scroller: "max-lg:[@media(height<64rem)]:rail-scroll", row: "max-lg:[@media(height<64rem)]:rail-row", hint: "max-lg:[@media(height<64rem)]:rail-hint" },
  xl: { scroller: "max-xl:[@media(height<64rem)]:rail-scroll", row: "max-xl:[@media(height<64rem)]:rail-row", hint: "max-xl:[@media(height<64rem)]:rail-hint" },
};

/**
 * A row of cards that swipes below `until` and is the caller's grid from it up. Narrow, the row scrolls sideways
 * inside itself with snap points, out to the screen's edges, and each card leaves a peek of the next; the scroller is
 * a labelled region in the tab order, so arrow keys scroll it, and on touch screens a thumb under it shows where you
 * are. Wide, the scroller has no box, so it's no tab stop, and the list lays out with `className`.
 *
 * The children are the cards, the list's items. Leave display to the rail and pass the wide layout with the
 * breakpoint, e.g. `gap-4 lg:grid-cols-3`. `flush` keeps the cards inside the parent instead of bleeding into the
 * screen's gutters; use it when the rail doesn't sit at the section's content edge. `shortUntil`, wider than `until`,
 * also swipes below it on a screen under 1024 px tall, so a laptop or a landscape tablet keeps the row and only a tall
 * portrait tablet gets the grid. `tall` lets the cards take a share of a tall phone's spare height, for a section whose
 * rail is the main content.
 */
export function Rail({
  label,
  until,
  shortUntil,
  as: List = "ul",
  flush = false,
  tall = false,
  className = "",
  children,
}: {
  label: string;
  until: RailBreakpoint;
  shortUntil?: RailBreakpoint;
  as?: "ul" | "ol" | "dl" | "div";
  flush?: boolean;
  tall?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const wide = BELOW[until];
  const short = shortUntil ? SHORT_BELOW[shortUntil] : { scroller: "", row: "", hint: "" };
  const below = { scroller: `${wide.scroller} ${short.scroller}`, row: `${wide.row} ${short.row}`, hint: `${wide.hint} ${short.hint}` };
  return (
    <div className={`rail ${flush ? "rail-flush" : ""} ${tall ? "rail-tall" : ""}`}>
      <div role="region" aria-label={label} tabIndex={0} className={`contents ${below.scroller}`}>
        <List className={`grid ${below.row} ${className}`}>{children}</List>
      </div>
      <div aria-hidden className={`hidden ${below.hint}`}>
        <span />
      </div>
    </div>
  );
}
