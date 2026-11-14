export const SITE_NAME = "UNSTUCK";

export const SITE_SUMMARY =
  "UNSTUCK is for grantees whose milestone payment is waiting on a reviewer's comment. You paste the GitHub issue or pull request, pick the sentences that are asks and give each a check. UNSTUCK reruns those checks offline on the last commit before the review and tags each ask from the exit codes, with a public run record behind every tag. Hiring an agent on NEAR Agent Market to build what's missing is built but switched off, so nothing can be charged today.";

const LOCAL_URL = "http://localhost:3000";

/** `SITE_URL` with no trailing slash. Static pages read it at build time, so the image build has to receive it too. */
export function siteUrlFrom(value: string | undefined): string {
  const raw = value?.trim() || LOCAL_URL;
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`SITE_URL must be an http(s) URL, got ${raw}`);
  return url.origin;
}

export const SITE_URL = siteUrlFrom(process.env.SITE_URL);

/**
 * Search engines are only invited in on an https origin. A bare IP or localhost canonical would get indexed and then
 * have to be unlearned once the real domain arrives.
 */
export const INDEXABLE = SITE_URL.startsWith("https://");

export const absoluteUrl = (path: string): string => `${SITE_URL}${path === "/" ? "" : path}`;
