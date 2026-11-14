import { z } from "zod";
import { enqueue, milestones, type Db } from "@unstuck/db";
import { GitHubClient, parseThreadUrl, type Thread, type ThreadComment } from "@unstuck/integrations/github";

export const importThreadPayload = z.object({
  threadUrl: z.string().url(),
  commentId: z.string().optional(),
  codeRepoUrl: z.string().url().optional(),
});

export function pickReviewerComment(thread: Thread, commentId?: string): ThreadComment | undefined {
  if (commentId) return thread.comments.find((c) => c.id === commentId || c.id.endsWith(`_${commentId}`));
  return thread.comments.findLast((c) => c.author !== thread.author && !c.author.endsWith("[bot]") && c.body.trim().length > 0);
}

export async function importThread(db: Db, github: GitHubClient, raw: unknown): Promise<string> {
  const payload = importThreadPayload.parse(raw);
  const ref = parseThreadUrl(payload.threadUrl);
  const thread = await github.fetchThread(ref);
  const comment = pickReviewerComment(thread, payload.commentId);
  if (!comment) throw new Error(`no reviewer comment found on ${payload.threadUrl}`);

  const threadRepoUrl = `https://github.com/${ref.owner}/${ref.repo}`;
  const codeRepoUrl = payload.codeRepoUrl ?? (thread.ref.kind === "pull" ? threadRepoUrl : null);
  const pinnedSha =
    headShaApplies(codeRepoUrl, threadRepoUrl, thread.headSha) ??
    (codeRepoUrl ? await shaForRepoAt(github, codeRepoUrl, comment.createdAt) : null);

  const [row] = await db
    .insert(milestones)
    .values({
      threadUrl: thread.url,
      threadRepo: `${ref.owner}/${ref.repo}`,
      codeRepoUrl,
      pinnedSha,
      reviewerCommentId: comment.id,
      reviewerCommentBody: comment.body,
      reviewerLogin: comment.author,
      reviewerCommentAt: new Date(comment.createdAt),
      reviewerCommentUrl: comment.url,
      threadTitle: thread.title,
      ownerLogin: thread.author,
    })
    .returning({ id: milestones.id });
  if (!row) throw new Error("milestone insert returned no row");

  await enqueue(db, "extract_asks", { milestoneId: row.id }, { dedupeKey: `extract:${row.id}` });
  return row.id;
}

async function shaForRepoAt(github: GitHubClient, repoUrl: string, isoDate: string): Promise<string | null> {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(repoUrl);
  if (!match?.[1] || !match[2]) throw new Error(`unsupported code repo url: ${repoUrl}`);
  return github.shaAt(match[1], match[2], isoDate);
}

export function headShaApplies(codeRepoUrl: string | null, threadRepoUrl: string, headSha: string | null): string | null {
  return codeRepoUrl !== null && headSha !== null && sameRepo(codeRepoUrl, threadRepoUrl) ? headSha : null;
}

function sameRepo(a: string, b: string): boolean {
  const normalize = (url: string) => url.toLowerCase().replace(/\.git$/, "").replace(/\/$/, "");
  return normalize(a) === normalize(b);
}
