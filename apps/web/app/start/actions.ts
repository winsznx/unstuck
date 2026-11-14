"use server";

import { suggestAsks } from "@unstuck/pipeline/suggest-asks";
import { nearAi } from "@/lib/near-ai";
import { github } from "./github-read";
import { createMilestone, read, readCodeAt, type CodeRead, type Result, type StartInput, type ThreadRead } from "./start-core";

export type { CodeRead } from "./github-read";
export type { Result, StartInput, ThreadComment, ThreadRead } from "./start-core";

export async function readThread(rawUrl: string): Promise<Result<ThreadRead>> {
  return read(rawUrl, github());
}

export async function readCode(repoUrl: string, at: string, from?: string): Promise<Result<CodeRead>> {
  return readCodeAt(repoUrl, at, from);
}

export interface AskSuggestion {
  start: number;
  text: string;
  reason: string;
}

/** `null` means NEAR AI isn't configured on this server, so the grantee picks every ask by hand. */
export type AskSuggestions = { asks: AskSuggestion[]; model: string } | null;

/**
 * Reads the comment again from GitHub rather than trusting text from the browser, so credits are only spent on a
 * real review comment.
 */
export async function suggestAsksFor(threadUrl: string, commentId: string): Promise<Result<AskSuggestions>> {
  const ai = nearAi();
  if (!ai) return { ok: true, value: null };
  const thread = await read(threadUrl, github());
  if (!thread.ok) return thread;
  const comment = thread.value.comments.find((c) => c.id === commentId);
  if (!comment) return { ok: false, error: "That comment is no longer on the thread." };
  try {
    const { asks, model } = await suggestAsks(comment.body, ai);
    return { ok: true, value: { asks: asks.map(({ start, text, reason }) => ({ start, text, reason })), model } };
  } catch (error) {
    console.error("NEAR AI ask suggestion failed", error);
    return { ok: false, error: "NEAR AI didn't answer, so nothing is ticked. Pick the asks yourself." };
  }
}

export async function startMilestone(raw: StartInput): Promise<Result<string>> {
  return createMilestone(raw);
}
