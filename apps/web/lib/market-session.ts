import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { jobs, mandates, marketClients, marketSessions, milestones } from "@unstuck/db";
import { MARKET_OAUTH, MarketMcp } from "@unstuck/integrations/agent-market";
import type { AccountView, DeviceFlow, HireRow, HireStatus, SpendingLimit } from "./account";
import { db } from "./db";
import { repoName } from "./format";
import {
  balanceCents,
  pollDeviceFlow,
  revokeAll,
  startDeviceFlow,
  withSessionMarket,
  type ClientStore,
  type MarketCalls,
  type SignInDeps,
  type SignInPoll,
  type StoredSession,
  type TokenDeps,
} from "./market-auth";
import { MarketKeyError, tokenKey, unseal } from "./market-crypto";

export const SESSION_COOKIE = "unstuck_market";
const DEVICE_COOKIE = "unstuck_market_device";
const SESSION_MAX_AGE = 30 * 86_400;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Logs the message and the error's message only. Never pass a token here. */
export function logMarket(message: string, error?: unknown): void {
  console.error(`[agent-market] ${message}`, error instanceof Error ? `${error.name}: ${error.message}` : (error ?? ""));
}

const cookieOptions = (maxAge: number) => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge });

async function findClientId(): Promise<string | null> {
  const [row] = await db().select({ clientId: marketClients.clientId }).from(marketClients).where(eq(marketClients.issuer, MARKET_OAUTH.issuer));
  return row?.clientId ?? null;
}

const clients: ClientStore = {
  find: findClientId,
  async save(clientId) {
    await db().insert(marketClients).values({ issuer: MARKET_OAUTH.issuer, clientId }).onConflictDoNothing();
    return (await findClientId()) ?? clientId;
  },
};

const openMarket = (accessToken: string): MarketCalls => new MarketMcp({ accessToken });

async function signInDeps(): Promise<SignInDeps> {
  const jar = await cookies();
  return {
    fetch,
    key: tokenKey(),
    now: () => new Date(),
    clients,
    device: {
      read: () => jar.get(DEVICE_COOKIE)?.value,
      write: (value, maxAge) => jar.set(DEVICE_COOKIE, value, cookieOptions(maxAge)),
      clear: () => jar.delete(DEVICE_COOKIE),
    },
    sessions: {
      async create(session) {
        const [row] = await db().insert(marketSessions).values(session).returning({ id: marketSessions.id });
        if (!row) throw new Error("market session insert returned no row");
        return row.id;
      },
    },
    session: { set: (id) => jar.set(SESSION_COOKIE, id, cookieOptions(SESSION_MAX_AGE)) },
    market: openMarket,
    log: logMarket,
  };
}

/** startSignIn's work. A missing MARKET_TOKEN_KEY refuses before anything is sent to Agent Market. */
export async function beginSignIn(): Promise<DeviceFlow> {
  try {
    return await startDeviceFlow(await signInDeps());
  } catch (error) {
    if (error instanceof MarketKeyError) return { kind: "unavailable", reason: error.message };
    logMarket("sign-in: device code request failed", error);
    return { kind: "error", message: "Agent Market didn't give a sign-in code. Nothing was connected. Try again in a minute." };
  }
}

export async function continueSignIn(): Promise<SignInPoll> {
  try {
    return await pollDeviceFlow(await signInDeps());
  } catch (error) {
    if (error instanceof MarketKeyError) return { kind: "error", message: error.message };
    logMarket("sign-in: token poll failed", error);
    return { kind: "error", message: "Agent Market didn't answer while UNSTUCK waited for your approval. Get a new code to try again." };
  }
}

function toStored(row: typeof marketSessions.$inferSelect): StoredSession {
  return {
    id: row.id,
    handle: row.handle,
    nearAccountId: row.nearAccountId,
    emailVerified: row.emailVerified,
    accessTokenEnc: row.accessTokenEnc,
    refreshTokenEnc: row.refreshTokenEnc,
    accessExpiresAt: row.accessExpiresAt,
    scopes: row.scopes,
    createdAt: row.createdAt,
  };
}

/** The viewer's live session, from the httpOnly cookie. null when signed out, signed out elsewhere, or unreadable. */
export async function currentSession(): Promise<StoredSession | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id || !UUID.test(id)) return null;
  const [row] = await db()
    .select()
    .from(marketSessions)
    .where(and(eq(marketSessions.id, id), isNull(marketSessions.revokedAt)));
  return row ? toStored(row) : null;
}

function tokenDeps(): TokenDeps {
  return {
    fetch,
    key: tokenKey(),
    now: () => new Date(),
    clientId: findClientId,
    async saveTokens(sessionId, tokens) {
      await db().update(marketSessions).set(tokens).where(eq(marketSessions.id, sessionId));
    },
    market: openMarket,
  };
}

/** Runs `work` on Agent Market's MCP server as the session's owner, refreshing the token when it has to. */
export function withMarket<T>(session: StoredSession, work: (market: MarketCalls) => Promise<T>): Promise<T> {
  return withSessionMarket(tokenDeps(), session, work);
}

/** Revokes both tokens on Agent Market, ends the session here and clears the cookie. */
export async function endSession(): Promise<void> {
  const session = await currentSession();
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(DEVICE_COOKIE);
  if (!session) return;
  await db().update(marketSessions).set({ revokedAt: new Date() }).where(eq(marketSessions.id, session.id));
  try {
    const key = tokenKey();
    const clientId = await findClientId();
    if (!clientId) return;
    const access = unseal(session.accessTokenEnc, "access", key);
    const refresh = session.refreshTokenEnc ? unseal(session.refreshTokenEnc, "refresh", key) : null;
    await revokeAll({ fetch, log: logMarket }, clientId, access, refresh);
  } catch (error) {
    logMarket("sign-out: couldn't revoke on Agent Market", error);
  }
}

type MandateRow = typeof mandates.$inferSelect;

export function limitOf(row: MandateRow): SpendingLimit {
  return {
    perHireCapCents: row.perJobCapCents,
    totalCapCents: row.totalCapCents,
    spentCents: row.spentCents,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

/** The handle's newest limit that wasn't replaced or turned off. Expired and used-up ones are still returned. */
export async function currentMandate(handle: string): Promise<MandateRow | null> {
  const [row] = await db()
    .select()
    .from(mandates)
    .where(and(eq(mandates.marketHandle, handle), isNull(mandates.revokedAt)))
    .orderBy(desc(mandates.createdAt))
    .limit(1);
  return row ?? null;
}

/** A new limit replaces the handle's current one. Spend starts again at zero under the new limit. */
export async function replaceMandate(handle: string, limit: { perHireCapCents: number; totalCapCents: number; expiresAt: Date }): Promise<void> {
  await db().transaction(async (tx) => {
    await tx
      .update(mandates)
      .set({ revokedAt: new Date() })
      .where(and(eq(mandates.marketHandle, handle), isNull(mandates.revokedAt)));
    await tx.insert(mandates).values({ marketHandle: handle, perJobCapCents: limit.perHireCapCents, totalCapCents: limit.totalCapCents, expiresAt: limit.expiresAt });
  });
}

const HIRE_STATUS: Record<string, HireStatus> = {
  sent: "running",
  accepted: "running",
  working: "running",
  delivered: "delivered",
  failed: "failed",
  refunded: "refunded",
};

async function hiresFor(handle: string): Promise<HireRow[]> {
  const rows = await db()
    .select({ job: jobs, repo: milestones.codeRepoUrl })
    .from(jobs)
    .innerJoin(mandates, eq(jobs.mandateId, mandates.id))
    .innerJoin(milestones, eq(jobs.milestoneId, milestones.id))
    .where(eq(mandates.marketHandle, handle))
    .orderBy(desc(jobs.createdAt))
    .limit(50);
  return rows.map(({ job, repo }) => ({
    id: job.id,
    milestoneId: job.milestoneId,
    repo: repoName(repo),
    agentName: job.agentName ?? job.agentId,
    priceCents: job.priceCents,
    status: HIRE_STATUS[job.status] ?? "running",
    startedAt: job.createdAt,
    finishedAt: null,
  }));
}

async function readBalance(session: StoredSession): Promise<number | null> {
  try {
    return balanceCents(await withMarket(session, (market) => market.whoami()));
  } catch (error) {
    logMarket("account: balance read failed", error);
    return null;
  }
}

/** The signed-in owner as /account shows them. The balance is read live from MARKET_WHOAMI; a failed read is null. */
export async function readAccount(): Promise<AccountView> {
  const session = await currentSession();
  if (!session) return { status: "signed_out" };
  const [balance, mandate, hires] = await Promise.all([readBalance(session), currentMandate(session.handle), hiresFor(session.handle)]);
  return {
    status: "signed_in",
    identity: { handle: session.handle, nearAccountId: session.nearAccountId },
    balanceCents: balance,
    balanceReadAt: new Date(),
    scopes: session.scopes,
    signedInAt: session.createdAt,
    limit: mandate ? limitOf(mandate) : null,
    hires,
  };
}
