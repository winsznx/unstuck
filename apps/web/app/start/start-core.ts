import "server-only";
import { z } from "zod";
import { enqueue, asks as asksTable, milestones, replays } from "@unstuck/db";
import { parseThreadUrl, type GitHubClient } from "@unstuck/integrations/github";
import { codeReposIn, pickReviewerComment } from "@unstuck/pipeline";
import { db } from "@/lib/db";
import { commitBefore, github, shapeAt, type CodeRead } from "./github-read";
import { IMAGES } from "./images";

export type { CodeRead } from "./github-read";

export interface ThreadComment {
  id: string;
  kind: "issue_comment" | "review" | "review_comment";
  author: string;
  association: string;
  createdAt: string;
  url: string;
  body: string;
}

export interface ThreadRead {
  threadUrl: string;
  repo: string;
  title: string;
  author: string;
  state: string;
  kind: "issue" | "pull";
  comments: ThreadComment[];
  suggestedCommentId: string | null;
  suggestedBecause: "link" | "reviewer" | null;
  repoCandidates: string[];
  prHead: { repoUrl: string; sha: string } | null;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };


const commentIdFromUrl = (url: string) => /#(?:issuecomment|discussion_r|pullrequestreview)-(\d+)/.exec(url)?.[1];

function githubError(error: unknown, what: string): string {
  const message = String(error);
  if (message.includes("rate limited") || message.includes(" 403 ") || message.includes(" 429 "))
    return "GitHub is limiting how often UNSTUCK can read right now. Wait a minute, then try again.";
  if (message.includes(" 404 ")) return `UNSTUCK couldn't open ${what}. Check the link. Private repos aren't supported yet.`;
  return `GitHub didn't answer while reading ${what}. Try again.`;
}

export async function read(rawUrl: string, client: GitHubClient): Promise<Result<ThreadRead>> {
  let ref;
  try {
    ref = parseThreadUrl(rawUrl);
  } catch {
    return {
      ok: false,
      error: "That isn't a GitHub issue or pull request link. Open the comment on GitHub, use its menu to copy the link, and paste it here.",
    };
  }
  try {
    const thread = await client.fetchThread(ref);
    const comments = thread.comments.filter((c) => !c.author.endsWith("[bot]") && c.body.trim());
    const linked = commentIdFromUrl(rawUrl);
    const fromLink = linked ? comments.find((c) => c.id.endsWith(`_${linked}`)) : undefined;
    const suggested = fromLink ?? pickReviewerComment({ ...thread, comments });
    const threadRepoUrl = `https://github.com/${ref.owner}/${ref.repo}`;
    const fromText = codeReposIn([thread.body, ...comments.map((c) => c.body)].join("\n"), ref.owner, ref.repo);
    return {
      ok: true,
      value: {
        threadUrl: thread.url,
        repo: `${ref.owner}/${ref.repo}`,
        title: thread.title,
        author: thread.author,
        state: thread.state,
        kind: thread.ref.kind,
        comments: comments.map((c) => ({
          id: c.id,
          kind: c.kind,
          author: c.author,
          association: c.authorAssociation,
          createdAt: c.createdAt,
          url: c.url,
          body: c.body,
        })),
        suggestedCommentId: suggested?.id ?? null,
        suggestedBecause: fromLink ? "link" : suggested ? "reviewer" : null,
        repoCandidates: thread.ref.kind === "pull" ? [threadRepoUrl, ...fromText.filter((r) => r !== threadRepoUrl)] : fromText,
        prHead: thread.headSha ? { repoUrl: threadRepoUrl, sha: thread.headSha } : null,
      },
    };
  } catch (error) {
    return { ok: false, error: githubError(error, "that thread") };
  }
}


export const REPO = /^https:\/\/github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?\/?$/;

export async function readCodeAt(repoUrl: string, at: string, from?: string): Promise<Result<CodeRead>> {
  const match = REPO.exec(repoUrl.trim());
  const owner = match?.[1];
  const repo = match?.[2];
  if (!owner || !repo) return { ok: false, error: "Use the repo's GitHub address, like https://github.com/org/repo. Links to files or branches won't work here." };
  const cleanUrl = `https://github.com/${owner}/${repo}`;
  try {
    const commit = await commitBefore(owner, repo, at, from);
    if (!commit) return { ok: false, error: "That repo has no commits from before the comment was written. Check you picked the repo your reviewer looked at." };
    const shape = await shapeAt(owner, repo, commit.sha);
    return { ok: true, value: { repoUrl: cleanUrl, commit, shape } };
  } catch (error) {
    return { ok: false, error: githubError(error, `${owner}/${repo}`) };
  }
}

const startInput = z.object({
  threadUrl: z.string().url(),
  commentId: z.string().min(1),
  codeRepoUrl: z.string().regex(REPO),
  sha: z.string().regex(/^[0-9a-f]{40}$/),
  image: z.enum(IMAGES),
  install: z.string().max(2000),
  asks: z
    .array(z.object({ start: z.number().int().min(0), text: z.string().min(1).max(2000), command: z.string().max(2000), suggested: z.boolean().optional() }))
    .min(1)
    .max(12),
});

export type StartInput = z.infer<typeof startInput>;

export async function createMilestone(raw: StartInput): Promise<Result<string>> {
  const parsed = startInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Something in the earlier steps is incomplete. Open each step on the left and check it." };
  const input = parsed.data;
  if (!input.asks.some((a) => a.command.trim())) {
    return { ok: false, error: "None of the asks has a check, so there's nothing to run. Go back to the steps to rerun and add a check to at least one ask." };
  }

  const fresh = await read(input.threadUrl, github({ fresh: true }));
  if (!fresh.ok) return fresh;
  const comment = fresh.value.comments.find((c) => c.id === input.commentId);
  if (!comment) return { ok: false, error: "That comment is no longer on the thread. It may have been deleted. Go back to step 1 and pick again." };
  for (const ask of input.asks) {
    if (comment.body.slice(ask.start, ask.start + ask.text.length) !== ask.text) {
      return { ok: false, error: "Your reviewer edited the comment after you picked from it. Go back to step 3 and pick the sentences again." };
    }
  }

  const ref = parseThreadUrl(input.threadUrl);
  const milestoneId = await db().transaction(async (tx) => {
    const [milestone] = await tx
      .insert(milestones)
      .values({
        threadUrl: fresh.value.threadUrl,
        threadRepo: `${ref.owner}/${ref.repo}`,
        threadTitle: fresh.value.title,
        codeRepoUrl: input.codeRepoUrl.replace(/\.git$/, "").replace(/\/$/, ""),
        pinnedSha: input.sha,
        reviewerCommentId: comment.id,
        reviewerCommentBody: comment.body,
        reviewerCommentUrl: comment.url,
        reviewerCommentAt: new Date(comment.createdAt),
        reviewerLogin: comment.author,
        ownerLogin: fresh.value.author,
      })
      .returning({ id: milestones.id });
    if (!milestone) throw new Error("milestone insert returned no row");

    const askRows = await tx
      .insert(asksTable)
      .values(input.asks.map((a) => ({ milestoneId: milestone.id, quote: a.text, quoteStart: a.start, summary: a.text, severity: "unclear" as const, source: a.suggested ? "near-ai" : "owner" })))
      .returning({ id: asksTable.id, quoteStart: asksTable.quoteStart });
    const askIdAt = new Map(askRows.map((row) => [row.quoteStart, row.id]));

    const steps = [
      ...(input.install.trim()
        ? [{ name: "install", command: input.install.trim(), network: "bridge" as const, timeoutMs: 15 * 60_000, stopOnFail: true }]
        : []),
      ...input.asks.flatMap((a, i) => {
        const askId = askIdAt.get(a.start);
        if (!askId) throw new Error(`ask at ${a.start} was not saved`);
        return a.command.trim()
          ? [{ name: `check ${i + 1}`, command: a.command.trim(), network: "none" as const, timeoutMs: 10 * 60_000, stopOnFail: false, askId }]
          : [];
      }),
    ];

    if (steps.length > 0) {
      const [replay] = await tx
        .insert(replays)
        .values({ milestoneId: milestone.id, target: "base", sha: input.sha, image: input.image, steps })
        .returning({ id: replays.id });
      if (!replay) throw new Error("replay insert returned no row");
      await enqueue(tx, "replay", { replayId: replay.id }, { dedupeKey: `replay:${replay.id}` });
    }
    return milestone.id;
  });

  return { ok: true, value: milestoneId };
}
