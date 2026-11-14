import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { suggestAsks } from "@unstuck/pipeline/suggest-asks";
import { github } from "@/app/start/github-read";
import { IMAGES } from "@/app/start/images";
import { read } from "@/app/start/start-core";
import { startAgentCheck } from "../agent-check";
import { checkReport } from "../check-report";
import { compareAsks, latestPatch } from "../fix";
import { startFixCheck } from "../fix-check";
import { nearAi } from "../near-ai";
import { milestoneView } from "../queries";
import { SITE_SUMMARY, SITE_URL } from "../site";

export const SERVER_INFO = { name: "unstuck", title: "UNSTUCK", version: "1.0.0", websiteUrl: `${SITE_URL}/agents` };

export const SERVER_INSTRUCTIONS = `${SITE_SUMMARY}

Call \`unstuck_check\` with a public GitHub issue or pull request that holds a grant reviewer's comment. It starts a rerun and returns a milestone id at once; runs take one to a few minutes. Poll \`unstuck_status\` with that id until \`status\` is no longer \`running\`. Every \`still_missing\` or \`works\` verdict links to a public run record with the command, exit code and log. To check a fix, call \`unstuck_check_fix\` with the milestone id and a pull request, commit link or SHA, then poll \`unstuck_status\` again and read \`fix\`. \`unstuck_suggest_asks\` only reads: it shows which sentences NEAR AI counts as asks, without running anything. Nothing here posts to GitHub.`;

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;
const STARTS_RUN = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

function jsonResult(value: Record<string, unknown>): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value };
}

const errorResult = (message: string): CallToolResult => ({ content: [{ type: "text", text: message }], isError: true });

const MILESTONE_ID = z.string().uuid().describe("The milestone id unstuck_check returned.");

/** The check report, plus the latest fix run compared ask by ask when there is one. */
async function statusOf(milestoneId: string): Promise<Record<string, unknown> | null> {
  const view = await milestoneView(milestoneId);
  if (!view) return null;
  const report = checkReport(view, SITE_URL);
  const patch = latestPatch(view);
  const fix = patch
    ? {
        status: patch.replay.status,
        runRecord: `${SITE_URL}/runs/${patch.replay.id}`,
        asks: compareAsks(view, patch).map((c) => ({ n: c.n, quote: c.ask.quote, change: c.change })),
      }
    : null;
  return { ...report, fix };
}

/** A fresh server per request: the endpoint is stateless, so nothing is shared between clients. */
export function createUnstuckMcpServer(): McpServer {
  const server = new McpServer(SERVER_INFO, { instructions: SERVER_INSTRUCTIONS });

  server.registerTool(
    "unstuck_check",
    {
      title: "Rerun a grant reviewer's checks",
      description:
        "Starts a check of a grant milestone review: reads the reviewer's comment on a public GitHub issue or pull request, pins the last commit before it, and reruns one check per ask offline in Docker. Returns the milestone id and the run as it starts. Leave out `asks` and NEAR AI picks them from the comment word for word; leave out `checks` and UNSTUCK suggests one per ask from the repo.",
      inputSchema: {
        thread: z.string().url().describe("A public GitHub issue or pull request URL. A link to one comment picks that comment."),
        repo: z.string().url().optional().describe("The code repo's GitHub address, when the thread links several or none."),
        asks: z.array(z.string().min(1).max(2000)).max(12).optional().describe("The reviewer's sentences that count as asks, copied exactly."),
        checks: z
          .array(z.object({ ask: z.number().int().min(1).optional(), command: z.string().min(1).max(2000) }))
          .max(12)
          .optional()
          .describe("One shell command per ask, by the ask's number, that exits 0 when the ask is met. Runs with the network off."),
        image: z.enum(IMAGES).optional().describe("The container image. Defaults to one picked from the repo's files."),
      },
      annotations: STARTS_RUN,
    },
    async (input) => {
      const started = await startAgentCheck(input);
      if (!started.ok) return errorResult(started.error);
      const status = await statusOf(started.value.milestoneId);
      return jsonResult({ milestoneId: started.value.milestoneId, asksFrom: started.value.asksFrom, ...(status ?? {}) });
    },
  );

  server.registerTool(
    "unstuck_status",
    {
      title: "Read a check's result",
      description:
        "Returns the check report for a milestone: status (still_missing, works, not_sure, running, could_not_run or no_checks), each ask word for word with its verdict and failing line, the run record link, a brief a fixing agent can start from, and the latest fix run compared ask by ask.",
      inputSchema: { milestone: MILESTONE_ID },
      annotations: READ_ONLY,
    },
    async ({ milestone }) => {
      const status = await statusOf(milestone);
      return status ? jsonResult(status) : errorResult("No milestone with that id.");
    },
  );

  server.registerTool(
    "unstuck_check_fix",
    {
      title: "Check a fix",
      description:
        "Reruns a milestone's exact checks on the reviewed commit with a fix applied. The fix is a pull request, commit link or SHA in the reviewed repo or a fork; UNSTUCK uses GitHub's diff from the reviewed commit to it. Poll unstuck_status and read `fix`.",
      inputSchema: { milestone: MILESTONE_ID, fix: z.string().min(1).max(300).describe("A pull request link, commit link or commit SHA.") },
      annotations: STARTS_RUN,
    },
    async ({ milestone, fix }) => {
      const started = await startFixCheck(milestone, fix);
      if (!started.ok) return errorResult(started.error);
      return jsonResult({ milestone, fixRun: `${SITE_URL}/runs/${started.replayId}`, status: "running" });
    },
  );

  server.registerTool(
    "unstuck_suggest_asks",
    {
      title: "Find the asks in a review",
      description: "Reads the reviewer's comment on a public GitHub thread and returns the sentences NEAR AI counts as asks, word for word with their position. Runs nothing.",
      inputSchema: { thread: z.string().url().describe("A public GitHub issue or pull request URL, or a link to one comment.") },
      annotations: READ_ONLY,
    },
    async ({ thread }) => {
      const ai = nearAi();
      if (!ai) return errorResult("NEAR AI isn't configured on this server.");
      const found = await read(thread, github());
      if (!found.ok) return errorResult(found.error);
      const comment = found.value.comments.find((c) => c.id === found.value.suggestedCommentId);
      if (!comment) return errorResult("No reviewer comment found on that thread. Pass a link to the comment itself.");
      const { asks, model } = await suggestAsks(comment.body, ai);
      return jsonResult({ comment: { author: comment.author, url: comment.url }, model, asks });
    },
  );

  return server;
}
