/** The places UNSTUCK has, in the order a grantee meets them. Shared by the header, the phone menu and the jump palette. */

export interface Place {
  href: string;
  label: string;
  /** One line for the phone menu and the palette: what you find there. */
  hint: string;
  /** Other paths that belong to this place, such as a run record under Milestones. */
  also?: readonly string[];
}

export const PLACES: readonly Place[] = [
  { href: "/m", label: "Milestones", hint: "Every milestone you've started, and where each one stands", also: ["/runs"] },
  { href: "/study", label: "Study", hint: "What rerunning public grant reviews turned up" },
  { href: "/agents", label: "For agents", hint: "How your own agent will call UNSTUCK. Not open yet" },
  { href: "/docs", label: "Docs", hint: "How asks, checks, tags and run records work, and what UNSTUCK won't do" },
];

export const START: Place = { href: "/start", label: "Check a review", hint: "Paste the issue or PR with the review and run a check for each ask" };

const within = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/** The place a path belongs to, or null on the landing page and pages outside the map. */
export function placeFor(pathname: string): Place | null {
  if (within(pathname, START.href)) return START;
  return PLACES.find((place) => !place.href.includes("#") && [place.href, ...(place.also ?? [])].some((base) => within(pathname, base))) ?? null;
}

const GITHUB_THREAD = /^https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+\/(?:issues|pull)\/\d+(?:[/?#][^\s]*)?$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What a pasted or typed string can open: a reviewer's thread, or a milestone or run id. */
export type Jump = { kind: "thread"; url: string } | { kind: "id"; id: string } | null;

export function jumpFor(text: string): Jump {
  const value = text.trim();
  if (GITHUB_THREAD.test(value)) return { kind: "thread", url: value };
  if (UUID.test(value)) return { kind: "id", id: value.toLowerCase() };
  return null;
}
