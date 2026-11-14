import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport, StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import type { FetchLike, Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";

export const MARKET_MCP_URL = "https://market.near.ai/mcp";

/** A refusal the market answered as a tool result: `isError` true and `{refused, code, message, data}` as text. */
export class MarketRefusal extends Error {
  constructor(
    readonly tool: string,
    readonly code: number,
    message: string,
    /** `data.code`, such as `email_verification_required` or `job_deleted`. */
    readonly reason: string | null,
    readonly data: Record<string, unknown> | null,
  ) {
    super(message);
    this.name = "MarketRefusal";
  }
}

/** No tool ending in MARKET_PREPARE_JOB: hiring is switched off on the market, so UNSTUCK can browse but not hire. */
export class MarketHiringOff extends Error {
  constructor() {
    super("Hiring is switched off on Agent Market right now.");
    this.name = "MarketHiringOff";
  }
}

export class MarketToolMissing extends Error {
  constructor(readonly suffix: string) {
    super(`Agent Market doesn't offer ${suffix} to this account.`);
    this.name = "MarketToolMissing";
  }
}

/** The bearer token was refused. The caller refreshes it and tries once more. */
export class MarketUnauthorized extends Error {
  constructor() {
    super("Agent Market refused the access token.");
    this.name = "MarketUnauthorized";
  }
}

const refusal = z.object({ refused: z.unknown().optional(), code: z.number(), message: z.string(), data: z.record(z.string(), z.unknown()).nullish() });

const whoamiBody = z.object({
  user: z.object({
    handle: z.string().min(1),
    near_account_id: z.string().nullish(),
    email_verified: z.boolean().nullish(),
    email_verification_required: z.boolean().nullish(),
  }),
  account: z.object({ near_account_id: z.string().nullish() }).nullish(),
  balances: z.object({ usd: z.string().nullish(), credit_usd: z.string().nullish(), usdc: z.string().nullish() }).nullish(),
});

export interface Whoami {
  handle: string;
  nearAccountId: string | null;
  emailVerified: boolean | null;
  emailVerificationRequired: boolean;
  /** Decimal strings as the market sends them. null when the account or the balance couldn't be read. */
  balances: { usd: string | null; creditUsd: string | null; usdc: string | null } | null;
}

export interface PrepareJobInput {
  worker_agent_id: string;
  title: string;
  description: string;
  client_request_id: string;
  token?: "USD" | "USDC";
}

const draftBody = z.object({
  draft_id: z.string(),
  checkout_url: z.string().url(),
  quoted_price: z.union([z.string(), z.number()]),
  price_token: z.string().nullish(),
  replayed: z.boolean().nullish(),
});
const fundedBody = z.object({ job_id: z.string().min(1), job_url: z.string().nullish(), assignment_id: z.string().nullish() });

export type PreparedJob =
  | { kind: "draft"; draftId: string; checkoutUrl: string; quotedPrice: string; priceToken: string | null; replayed: boolean }
  | { kind: "funded"; jobId: string; jobUrl: string | null; assignmentId: string | null };

const statusBody = z.object({
  worker_state: z.string(),
  result_available: z.boolean(),
  auto_accept_at: z.string().nullish(),
  expected_by: z.string().nullish(),
});

export interface JobStatus {
  workerState: string;
  resultAvailable: boolean;
  autoAcceptAt: Date | null;
  expectedBy: Date | null;
}

const resultBody = z.discriminatedUnion("status", [
  z.object({ status: z.literal("delivered"), content_chunk: z.string(), bytes_total: z.number().optional(), next_offset: z.number().nullish() }),
  z.object({ status: z.literal("external"), deliverable_url: z.string() }),
  z.object({ status: z.literal("unavailable"), note: z.string().nullish() }),
]);

export type JobResult =
  | { status: "delivered"; contentChunk: string; nextOffset: number | null }
  | { status: "external"; deliverableUrl: string }
  | { status: "unavailable"; note: string | null };

export interface MarketMcpOptions {
  /** The owner's OAuth access token. Sent as a bearer header, never logged. */
  accessToken: string;
  url?: string;
  fetch?: FetchLike;
  /** For tests: a transport to use instead of Streamable HTTP. */
  transport?: Transport;
}

const date = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * The buyer half of Agent Market's MCP server, acting as the signed-in owner. Tool names are matched by their
 * MARKET_ suffix, since the wire adds a `marketplace__` prefix. One instance is one connection; close it when done.
 */
export class MarketMcp {
  readonly #client = new Client({ name: "unstuck", version: "0.1.0" });
  readonly #transport: Transport;
  #ready: Promise<string[]> | null = null;

  constructor(options: MarketMcpOptions) {
    // The SDK declares `sessionId?: string` on Transport but `string | undefined` on its own class, which only
    // conflicts under exactOptionalPropertyTypes. The class is the SDK's own Transport implementation.
    this.#transport =
      options.transport ??
      (new StreamableHTTPClientTransport(new URL(options.url ?? MARKET_MCP_URL), {
        requestInit: { headers: { authorization: `Bearer ${options.accessToken}` } },
        ...(options.fetch ? { fetch: options.fetch } : {}),
      }) as Transport);
  }

  async close(): Promise<void> {
    await this.#client.close();
  }

  /** False when the market offers no MARKET_PREPARE_JOB: hiring is off there, or the token belongs to an agent. */
  async canHire(): Promise<boolean> {
    return (await this.#tools()).some((name) => name.endsWith("MARKET_PREPARE_JOB"));
  }

  async whoami(): Promise<Whoami> {
    const body = whoamiBody.parse(await this.#call("MARKET_WHOAMI", {}));
    return {
      handle: body.user.handle,
      nearAccountId: body.user.near_account_id ?? body.account?.near_account_id ?? null,
      emailVerified: body.user.email_verified ?? null,
      emailVerificationRequired: body.user.email_verification_required ?? true,
      balances: body.balances ? { usd: body.balances.usd ?? null, creditUsd: body.balances.credit_usd ?? null, usdc: body.balances.usdc ?? null } : null,
    };
  }

  /** Saves a draft and answers its checkout page. The same client_request_id again answers the job once it's paid. */
  async prepareJob(input: PrepareJobInput): Promise<PreparedJob> {
    const raw = await this.#call("MARKET_PREPARE_JOB", { ...input });
    const funded = fundedBody.safeParse(raw);
    if (funded.success) return { kind: "funded", jobId: funded.data.job_id, jobUrl: funded.data.job_url ?? null, assignmentId: funded.data.assignment_id ?? null };
    const draft = draftBody.parse(raw);
    return {
      kind: "draft",
      draftId: draft.draft_id,
      checkoutUrl: draft.checkout_url,
      quotedPrice: String(draft.quoted_price),
      priceToken: draft.price_token ?? null,
      replayed: draft.replayed ?? false,
    };
  }

  async jobStatus(jobId: string): Promise<JobStatus> {
    const body = statusBody.parse(await this.#call("MARKET_GET_JOB_STATUS", { job_id: jobId }));
    return { workerState: body.worker_state, resultAvailable: body.result_available, autoAcceptAt: date(body.auto_accept_at), expectedBy: date(body.expected_by) };
  }

  async jobResult(jobId: string, offset?: number): Promise<JobResult> {
    const body = resultBody.parse(await this.#call("MARKET_GET_JOB_RESULT", offset === undefined ? { job_id: jobId } : { job_id: jobId, offset }));
    switch (body.status) {
      case "delivered":
        return { status: "delivered", contentChunk: body.content_chunk, nextOffset: body.next_offset ?? null };
      case "external":
        return { status: "external", deliverableUrl: body.deliverable_url };
      case "unavailable":
        return { status: "unavailable", note: body.note ?? null };
    }
  }

  #tools(): Promise<string[]> {
    this.#ready ??= this.#guard(async () => {
      await this.#client.connect(this.#transport);
      const names: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await this.#client.listTools(cursor ? { cursor } : {});
        names.push(...page.tools.map((t) => t.name));
        cursor = page.nextCursor;
      } while (cursor);
      return names;
    });
    return this.#ready;
  }

  async #call(suffix: string, args: Record<string, unknown>): Promise<unknown> {
    const name = (await this.#tools()).find((n) => n.endsWith(suffix));
    if (!name) throw suffix === "MARKET_PREPARE_JOB" ? new MarketHiringOff() : new MarketToolMissing(suffix);
    const result = await this.#guard(() => this.#client.callTool({ name, arguments: args }));
    const text = Array.isArray(result.content) ? result.content.find((c): c is { type: "text"; text: string } => c.type === "text")?.text : undefined;
    if (result.isError) {
      const parsed = refusal.safeParse(parseJson(text));
      if (!parsed.success) throw new MarketRefusal(suffix, -32603, text ?? "Agent Market refused without saying why.", null, null);
      const data = parsed.data.data ?? null;
      const reason = typeof data?.code === "string" ? data.code : null;
      throw new MarketRefusal(suffix, parsed.data.code, parsed.data.message, reason, data);
    }
    if (result.structuredContent && typeof result.structuredContent === "object") return result.structuredContent;
    if (text === undefined) throw new Error(`Agent Market answered ${suffix} with no text`);
    return parseJson(text);
  }

  async #guard<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof UnauthorizedError || (error instanceof StreamableHTTPError && error.code === 401)) throw new MarketUnauthorized();
      throw error;
    }
  }
}

function parseJson(text: string | undefined): unknown {
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
