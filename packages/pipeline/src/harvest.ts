import { z } from "zod";
import type { Thread, ThreadComment } from "@unstuck/integrations/github";

export interface Source {
  program: string;
  repo: string;
  kind: "issues" | "pulls";
  titlePattern?: RegExp;
  knownReviewers?: readonly string[];
}

export const SOURCES: readonly Source[] = [
  { program: "Canton Dev Fund", repo: "canton-foundation/canton-dev-fund", kind: "issues", titlePattern: /milestone/i },
  { program: "W3F Grants", repo: "w3f/Grant-Milestone-Delivery", kind: "pulls", knownReviewers: ["diogo-w3f", "keeganquigley"] },
  { program: "Filecoin Dev Grants", repo: "filecoin-project/devgrants", kind: "issues", titlePattern: /milestone|deliver/i },
];

const STRONG_SIGNALS: readonly [string, RegExp][] = [
  ["fails", /\b(fail(s|ed|ing)? (to|on|with|when)|error:|cannot find|not working|doesn'?t (work|run|build)|is broken|crash(es|ed)?)\b/i],
  ["missing", /\b(is missing|are missing|missing (a|the|an)\b|not (provided|included|hosted|published)|lacks?)\b/i],
  ["request", /\b(please (add|fix|provide|update|include|share)|need(s)? (to be|some|more)|could you (add|fix|provide)|requested follow-ups?|changes requested)\b/i],
  ["reproduce", /\b(couldn'?t|could not|unable to|not able to|can'?t) (run|build|reproduce|verify|test|install|self.verify)/i],
];
const TOPIC_SIGNALS: readonly [string, RegExp][] = [
  ["docs", /\b(readme|documentation|docs|testing guide|tutorial)\b/i],
  ["tests", /\b(tests?|coverage|ci)\b/i],
];
const DELIVERY_REPORT = /^\s*(#+\s*)?(\*\*)?\s*(milestone|m\d|evidence|acceptance criteria|delivery)\b[^\n]*\b(deliver(y|ed)?|complet(e|ed|ion)|ready for review|evidence|submission)/i;
const VOTE_FAILED = /the vote \*\*did not pass\*\*/i;
const REVIEWER_MIN_THREADS = 4;

const APPROVAL = /\b(milestone (is )?(approved|accepted)|has been (approved|accepted)|invoice form|lgtm|payment (has been )?(sent|initiated|released)|funds (to )?be sent|partyid you would like)\b/i;
const GITHUB_REPO = /https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?=[/#?)\s\]>.,]|$)/g;

export interface Candidate {
  program: string;
  url: string;
  title: string;
  grantee: string;
  reviewer: string;
  reviewerCommentUrl: string;
  reviewerCommentId: string;
  reviewerCommentAt: string;
  daysSinceReview: number;
  granteeRepliedAfter: boolean;
  voteFailed: boolean;
  signals: string[];
  codeRepos: string[];
  excerpt: string;
}

const isBot = (login: string) => login.endsWith("[bot]");

export function learnReviewers(threads: readonly Thread[]): Set<string> {
  const threadsPerAuthor = new Map<string, number>();
  for (const thread of threads) {
    for (const author of new Set(thread.comments.map((c) => c.author))) {
      if (!isBot(author)) threadsPerAuthor.set(author, (threadsPerAuthor.get(author) ?? 0) + 1);
    }
  }
  return new Set([...threadsPerAuthor].filter(([, n]) => n >= REVIEWER_MIN_THREADS).map(([author]) => author));
}

export function assess(program: string, thread: Thread, reviewers: ReadonlySet<string>, now: Date): Candidate | null {
  if (thread.comments.some((c) => APPROVAL.test(c.body))) return null;

  const reporters = new Set(thread.comments.filter((c) => DELIVERY_REPORT.test(c.body)).map((c) => c.author));
  const isReviewer = (login: string) => reviewers.has(login) && !reporters.has(login);
  const review = thread.comments.findLast((c) => isReviewer(c.author) && strongSignalsOf(c).length > 0);
  if (!review) return null;

  const grantees = new Set([thread.author, ...reporters].filter((a) => !reviewers.has(a) || reporters.has(a)));
  const granteeRepliedAfter = thread.comments.some((c) => grantees.has(c.author) && c.createdAt > review.createdAt);
  const voteFailed = thread.comments.some((c) => isBot(c.author) && VOTE_FAILED.test(c.body));
  return {
    program,
    url: thread.url,
    title: thread.title,
    grantee: thread.author,
    reviewer: review.author,
    reviewerCommentUrl: review.url,
    reviewerCommentId: review.id,
    reviewerCommentAt: review.createdAt,
    daysSinceReview: Math.floor((now.getTime() - Date.parse(review.createdAt)) / 86_400_000),
    granteeRepliedAfter,
    voteFailed,
    signals: [...strongSignalsOf(review), ...topicSignalsOf(review)],
    codeRepos: codeReposIn(`${thread.body}\n${review.body}`, thread.ref.owner, thread.ref.repo),
    excerpt: review.body.replace(/\s+/g, " ").slice(0, 400),
  };
}

const strongSignalsOf = (c: ThreadComment) => STRONG_SIGNALS.filter(([, p]) => p.test(c.body)).map(([name]) => name);
const topicSignalsOf = (c: ThreadComment) => TOPIC_SIGNALS.filter(([, p]) => p.test(c.body)).map(([name]) => name);

const NOT_REPO_OWNERS = new Set(["user-attachments", "orgs", "users", "settings", "sponsors", "marketplace", "apps", "features", "topics", "collections"]);

export function codeReposIn(text: string, threadOwner: string, threadRepo: string): string[] {
  const repos = new Set<string>();
  for (const match of text.matchAll(GITHUB_REPO)) {
    const [, owner, repo] = match;
    if (!owner || !repo || NOT_REPO_OWNERS.has(owner.toLowerCase())) continue;
    if (owner.toLowerCase() === threadOwner.toLowerCase() && repo.toLowerCase() === threadRepo.toLowerCase()) continue;
    repos.add(`https://github.com/${owner}/${repo.replace(/\.git$/, "")}`);
  }
  return [...repos];
}

const listItem = z.object({ html_url: z.string(), pull_request: z.unknown().optional() });

export async function listOpen(token: string | undefined, source: Source, limit: number): Promise<string[]> {
  const urls: string[] = [];
  for (let page = 1; urls.length < limit && page <= 10; page++) {
    const path = source.kind === "pulls" ? "pulls" : "issues";
    const response = await fetch(`https://api.github.com/repos/${source.repo}/${path}?state=open&per_page=100&page=${page}&sort=updated`, {
      headers: { accept: "application/vnd.github+json", "user-agent": "unstuck", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    });
    if (!response.ok) throw new Error(`GitHub ${response.status} listing ${source.repo}`);
    const items = z.array(listItem.extend({ title: z.string() })).parse(await response.json());
    if (items.length === 0) break;
    for (const item of items) {
      if (source.kind === "issues" && item.pull_request !== undefined) continue;
      if (source.titlePattern && !source.titlePattern.test(item.title)) continue;
      urls.push(item.html_url);
    }
  }
  return urls.slice(0, limit);
}
