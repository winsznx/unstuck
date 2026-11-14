import "server-only";
import { count, inArray } from "drizzle-orm";
import { replays } from "@unstuck/db";
import { suggestAsks } from "@unstuck/pipeline/suggest-asks";
import { github } from "@/app/start/github-read";
import { IMAGES } from "@/app/start/images";
import { imageFor, installFor } from "@/app/start/repo-shape";
import { createMilestone, read, readCodeAt, type Result } from "@/app/start/start-core";
import { reviewerCommands, suggestionsFor } from "@/app/start/suggest";
import { db } from "./db";
import { nearAi } from "./near-ai";

export interface AgentCheckInput {
  thread: string;
  /** The code repo, when the thread links several or none. */
  repo?: string | undefined;
  asks?: string[] | undefined;
  checks?: { ask?: number | undefined; command: string }[] | undefined;
  image?: string | undefined;
}

export interface AgentCheckStarted {
  milestoneId: string;
  asksFrom: "caller" | "near-ai";
}

const isImage = (value: string | undefined): value is (typeof IMAGES)[number] => IMAGES.some((image) => image === value);

/** Runs share one worker. Past this many waiting or running, a new check is refused rather than queued for hours. */
const MAX_PENDING_RUNS = 6;

async function pendingRuns(): Promise<number> {
  const [row] = await db().select({ n: count() }).from(replays).where(inArray(replays.status, ["queued", "running"]));
  return row?.n ?? 0;
}

/**
 * The check an agent asks for, built the way the /start flow builds it: the reviewer's comment, the last commit
 * before it, asks that are word-for-word spans, and a check per ask. Anything the caller leaves out is filled the
 * same way the web suggests it, with NEAR AI picking the asks.
 */
export async function startAgentCheck(input: AgentCheckInput): Promise<Result<AgentCheckStarted>> {
  if ((await pendingRuns()) >= MAX_PENDING_RUNS) return { ok: false, error: "UNSTUCK is busy with other runs. Try again in a few minutes." };

  const thread = await read(input.thread, github());
  if (!thread.ok) return thread;
  const comment = thread.value.comments.find((c) => c.id === thread.value.suggestedCommentId);
  if (!comment) return { ok: false, error: "No reviewer comment found on that thread. Pass a link to the comment itself." };

  const repoUrl = input.repo ?? thread.value.repoCandidates[0] ?? thread.value.prHead?.repoUrl;
  if (!repoUrl) return { ok: false, error: "The thread doesn't link a code repo. Pass `repo` with its GitHub address." };
  const from = thread.value.prHead?.repoUrl === repoUrl ? thread.value.prHead.sha : undefined;
  const code = await readCodeAt(repoUrl, comment.createdAt, from);
  if (!code.ok) return code;

  let picked: { start: number; text: string; suggested: boolean }[];
  let asksFrom: AgentCheckStarted["asksFrom"] = "caller";
  if (input.asks?.length) {
    picked = [];
    for (const quote of input.asks) {
      const start = comment.body.indexOf(quote);
      if (start === -1) return { ok: false, error: `This ask isn't in the reviewer's comment word for word: "${quote.slice(0, 120)}"` };
      picked.push({ start, text: quote, suggested: false });
    }
  } else {
    const ai = nearAi();
    if (!ai) return { ok: false, error: "Pass `asks`: the reviewer's sentences that count as asks, copied exactly." };
    const suggested = await suggestAsks(comment.body, ai);
    if (suggested.asks.length === 0) return { ok: false, error: "NEAR AI found no asks in the reviewer's comment. Pass `asks` to choose them yourself." };
    picked = suggested.asks.map((a) => ({ start: a.start, text: a.text, suggested: true }));
    asksFrom = "near-ai";
  }
  picked.sort((a, b) => a.start - b.start);

  const fromReviewer = reviewerCommands(comment.body);
  const asks = picked.map((ask, i) => {
    const given = input.checks?.find((c) => c.ask === i + 1)?.command;
    const command = given ?? suggestionsFor(ask.text, code.value.shape, fromReviewer)[0]?.command ?? "";
    return { start: ask.start, text: ask.text, command, suggested: ask.suggested };
  });
  const image = isImage(input.image) ? input.image : imageFor(code.value.shape);

  const created = await createMilestone({
    threadUrl: thread.value.threadUrl,
    commentId: comment.id,
    codeRepoUrl: code.value.repoUrl,
    sha: code.value.commit.sha,
    image: isImage(image) ? image : "node:22-bookworm-slim",
    install: installFor(code.value.shape).command,
    asks,
  });
  return created.ok ? { ok: true, value: { milestoneId: created.value, asksFrom } } : created;
}
