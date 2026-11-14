import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { MarketHiringOff, MarketMcp, MarketRefusal, MarketToolMissing, MarketUnauthorized } from "./client";

type Handler = (args: Record<string, unknown>) => CallToolResult;

const ok = (body: unknown): CallToolResult => ({ content: [{ type: "text", text: JSON.stringify(body) }] });
const refused = (code: number, message: string, data?: Record<string, unknown>): CallToolResult => ({
  isError: true,
  content: [{ type: "text", text: JSON.stringify({ refused: true, code, message, data: data ?? null }) }],
});

/** A fake market: an MCP server over an in-memory transport, with tools named as the wire names them. */
async function market(tools: Record<string, Handler>) {
  const server = new McpServer({ name: "fake-market", version: "1.0.0" });
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  for (const [suffix, handler] of Object.entries(tools)) {
    const name = `marketplace__${suffix}`;
    server.registerTool(name, { inputSchema: { job_id: z.string().optional(), offset: z.number().optional() }, annotations: {} }, (args: Record<string, unknown>) => {
      calls.push({ name, args });
      return handler(args);
    });
  }
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  return { mcp: new MarketMcp({ accessToken: "secret", transport: clientSide }), calls };
}

const WHOAMI = {
  marketplace: "market.near.ai",
  user: { handle: "ada", role: "user", email_verified: true, email_verification_required: true },
  account: { near_account_id: "ada.near" },
  balances: { usd: "42.50", credit_usd: "0.00", usdc: null },
};

describe("MarketMcp", () => {
  it("reads who the token acts for, matching the tool by suffix", async () => {
    const { mcp } = await market({ MARKET_WHOAMI: () => ok(WHOAMI) });
    expect(await mcp.whoami()).toEqual({
      handle: "ada",
      nearAccountId: "ada.near",
      emailVerified: true,
      emailVerificationRequired: true,
      balances: { usd: "42.50", creditUsd: "0.00", usdc: null },
    });
    await mcp.close();
  });

  it("answers a draft with its checkout page", async () => {
    const { mcp, calls } = await market({
      MARKET_PREPARE_JOB: () => ok({ draft_id: "d1", checkout_url: "https://market.near.ai/checkout/d1", quoted_price: "12.00", price_token: "USD", replayed: false }),
    });
    const input = { worker_agent_id: "a1", title: "Fix it", description: "brief", client_request_id: "r1" };
    expect(await mcp.prepareJob(input)).toEqual({ kind: "draft", draftId: "d1", checkoutUrl: "https://market.near.ai/checkout/d1", quotedPrice: "12.00", priceToken: "USD", replayed: false });
    expect(calls[0]?.name).toBe("marketplace__MARKET_PREPARE_JOB");
  });

  it("answers the job once the draft was paid", async () => {
    const { mcp } = await market({ MARKET_PREPARE_JOB: () => ok({ job_id: "j1", job_url: "https://market.near.ai/jobs/j1", assignment_id: "as1", funded: true }) });
    expect(await mcp.prepareJob({ worker_agent_id: "a1", title: "t", description: "d", client_request_id: "r1" })).toEqual({
      kind: "funded",
      jobId: "j1",
      jobUrl: "https://market.near.ai/jobs/j1",
      assignmentId: "as1",
    });
  });

  it("says hiring is off when there's no PREPARE_JOB tool", async () => {
    const { mcp } = await market({ MARKET_WHOAMI: () => ok(WHOAMI) });
    expect(await mcp.canHire()).toBe(false);
    await expect(mcp.prepareJob({ worker_agent_id: "a", title: "t", description: "d", client_request_id: "r" })).rejects.toBeInstanceOf(MarketHiringOff);
  });

  it("names any other missing tool", async () => {
    const { mcp } = await market({ MARKET_WHOAMI: () => ok(WHOAMI) });
    await expect(mcp.jobResult("j1")).rejects.toBeInstanceOf(MarketToolMissing);
  });

  it("parses a refusal into a typed error with data.code", async () => {
    const { mcp } = await market({
      MARKET_PREPARE_JOB: () => refused(-32003, "Confirm your email first.", { code: "email_verification_required" }),
    });
    const error = await mcp.prepareJob({ worker_agent_id: "a", title: "t", description: "d", client_request_id: "r" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MarketRefusal);
    expect(error).toMatchObject({ code: -32003, reason: "email_verification_required", message: "Confirm your email first." });
  });

  it("keeps a refusal whose text isn't JSON as a refusal", async () => {
    const { mcp } = await market({ MARKET_GET_JOB_STATUS: () => ({ isError: true, content: [{ type: "text", text: "boom" }] }) });
    await expect(mcp.jobStatus("j1")).rejects.toMatchObject({ name: "MarketRefusal", message: "boom", reason: null });
  });

  it("reads a job's status", async () => {
    const { mcp, calls } = await market({
      MARKET_GET_JOB_STATUS: () => ok({ worker_state: "still working", result_available: false, auto_accept_at: null, expected_by: "2026-11-16T10:00:00Z", status: "in_progress" }),
    });
    expect(await mcp.jobStatus("j1")).toEqual({ workerState: "still working", resultAvailable: false, autoAcceptAt: null, expectedBy: new Date("2026-11-16T10:00:00Z") });
    expect(calls[0]?.args).toEqual({ job_id: "j1" });
  });

  it("reads each result shape, passing the offset", async () => {
    const shapes = [
      { status: "delivered", content_chunk: "see https://github.com/o/r/pull/3", bytes_total: 40, next_offset: 40 },
      { status: "external", deliverable_url: "https://github.com/o/r/commit/abc1234" },
      { status: "unavailable", note: "no agent has delivered yet" },
    ];
    let i = 0;
    const { mcp, calls } = await market({ MARKET_GET_JOB_RESULT: () => ok(shapes[i++]) });
    expect(await mcp.jobResult("j1")).toEqual({ status: "delivered", contentChunk: "see https://github.com/o/r/pull/3", nextOffset: 40 });
    expect(await mcp.jobResult("j1", 40)).toEqual({ status: "external", deliverableUrl: "https://github.com/o/r/commit/abc1234" });
    expect(await mcp.jobResult("j1")).toEqual({ status: "unavailable", note: "no agent has delivered yet" });
    expect(calls[1]?.args).toEqual({ job_id: "j1", offset: 40 });
  });

  it("turns an HTTP 401 into MarketUnauthorized and sends the bearer header", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const mcp = new MarketMcp({ accessToken: "tok", url: "https://market.example/mcp", fetch: fetchFn });
    await expect(mcp.whoami()).rejects.toBeInstanceOf(MarketUnauthorized);
    const headers = new Headers(fetchFn.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toBe("Bearer tok");
  });
});
