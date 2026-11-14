const LINK =
  /^https:\/\/github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})\/(issues|pull)\/(\d+)\/?(?:[?][^#]*)?(?:#(?:issuecomment|discussion_r|pullrequestreview)-(\d+))?/;

export interface LinkTarget {
  repo: string;
  kind: "issue" | "pull";
  number: number;
  comment: string | null;
}

export function parseLink(url: string): LinkTarget | null {
  const m = LINK.exec(url.trim());
  if (!m?.[1] || !m[2] || !m[4]) return null;
  return { repo: `${m[1]}/${m[2]}`, kind: m[3] === "pull" ? "pull" : "issue", number: Number(m[4]), comment: m[5] ?? null };
}
