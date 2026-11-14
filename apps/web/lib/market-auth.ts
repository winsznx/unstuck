import {
  MarketUnauthorized,
  pollDeviceToken,
  registerClient,
  refreshTokens,
  requestDeviceCode,
  revokeToken,
  type MarketMcp,
  type TokenSet,
  type Whoami,
} from "@unstuck/integrations/agent-market";
import { seal, unseal } from "./market-crypto";
import type { DeviceFlow, MarketIdentity } from "./account";

/**
 * Agent Market sign-in and token upkeep, written against small interfaces so the rules can be tested without a
 * database, cookies or the network. lib/market-session.ts passes the real ones.
 */

export type MarketCalls = Pick<MarketMcp, "whoami" | "canHire" | "prepareJob" | "jobStatus" | "jobResult" | "close">;

export interface NewSession {
  handle: string;
  nearAccountId: string | null;
  emailVerified: boolean | null;
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
  accessExpiresAt: Date | null;
  scopes: string[];
}

export interface StoredSession extends NewSession {
  id: string;
  createdAt: Date;
}

export interface SealedTokens {
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
  accessExpiresAt: Date | null;
}

export interface ClientStore {
  find(): Promise<string | null>;
  /** Saves a fresh registration. Answers the id that ends up stored, which is another request's when two raced. */
  save(clientId: string): Promise<string>;
}

export interface CookieJar {
  read(): string | undefined;
  write(value: string, maxAgeSeconds: number): void;
  clear(): void;
}

export interface SignInDeps {
  fetch: typeof fetch;
  key: Buffer;
  now: () => Date;
  clients: ClientStore;
  device: CookieJar;
  sessions: { create(session: NewSession): Promise<string> };
  session: { set(id: string): void };
  market: (accessToken: string) => MarketCalls;
  log: (message: string, error?: unknown) => void;
}

export type SignInPoll =
  /** Not approved yet. `slowDown` asks the caller to wait 5 seconds longer between polls, as RFC 8628 says. */
  | { kind: "waiting"; slowDown: boolean }
  | Extract<DeviceFlow, { kind: "approved" | "expired" | "denied" | "error" }>;

interface PendingDevice {
  deviceCode: string;
  clientId: string;
  expiresAt: string;
}

export const NO_HIRE_TOOL =
  "Agent Market signed you in, but didn't give UNSTUCK the hire tool. Approve as yourself, not as one of your agents, and try again. If you did, hiring is switched off on the market right now.";

export async function clientIdFor(deps: Pick<SignInDeps, "fetch" | "clients">): Promise<string> {
  return (await deps.clients.find()) ?? (await deps.clients.save(await registerClient(deps.fetch)));
}

export function sealTokens(tokens: TokenSet, key: Buffer, now: Date, keepRefresh: string | null = null): SealedTokens {
  const refresh = tokens.refreshToken ?? keepRefresh;
  return {
    accessTokenEnc: seal(tokens.accessToken, "access", key),
    refreshTokenEnc: refresh ? seal(refresh, "refresh", key) : null,
    accessExpiresAt: tokens.expiresInSeconds === null ? null : new Date(now.getTime() + tokens.expiresInSeconds * 1000),
  };
}

/** Registers UNSTUCK if it isn't yet, asks for a device code, and keeps the code in a sealed cookie for the polls. */
export async function startDeviceFlow(deps: SignInDeps): Promise<DeviceFlow> {
  const clientId = await clientIdFor(deps);
  const code = await requestDeviceCode(deps.fetch, clientId);
  const expiresAt = new Date(deps.now().getTime() + code.expiresInSeconds * 1000);
  const pending: PendingDevice = { deviceCode: code.deviceCode, clientId, expiresAt: expiresAt.toISOString() };
  deps.device.write(seal(JSON.stringify(pending), "device", deps.key), code.expiresInSeconds);
  return {
    kind: "pending",
    userCode: code.userCode,
    verificationUri: code.verificationUri,
    verificationUriComplete: code.verificationUriComplete,
    expiresAt,
    intervalSeconds: code.intervalSeconds,
  };
}

function readPending(deps: SignInDeps): PendingDevice | null {
  const raw = deps.device.read();
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(unseal(raw, "device", deps.key));
    if (value && typeof value === "object" && "deviceCode" in value && "clientId" in value && "expiresAt" in value) {
      const { deviceCode, clientId, expiresAt } = value;
      if (typeof deviceCode === "string" && typeof clientId === "string" && typeof expiresAt === "string") return { deviceCode, clientId, expiresAt };
    }
    return null;
  } catch (error) {
    deps.log("market sign-in: unreadable device cookie", error);
    return null;
  }
}

/** One poll for the pending code. On approval it reads who signed in, stores the session and sets its cookie. */
export async function pollDeviceFlow(deps: SignInDeps): Promise<SignInPoll> {
  const pending = readPending(deps);
  if (!pending || new Date(pending.expiresAt) <= deps.now()) {
    deps.device.clear();
    return { kind: "expired" };
  }
  const poll = await pollDeviceToken(deps.fetch, pending.clientId, pending.deviceCode);
  switch (poll.kind) {
    case "pending":
      return { kind: "waiting", slowDown: false };
    case "slow_down":
      return { kind: "waiting", slowDown: true };
    case "denied":
    case "expired":
      deps.device.clear();
      return { kind: poll.kind };
    case "tokens":
      break;
  }

  const { tokens } = poll;
  deps.device.clear();
  const market = deps.market(tokens.accessToken);
  let who: Whoami;
  let hires: boolean;
  try {
    who = await market.whoami();
    hires = await market.canHire();
  } finally {
    await market.close();
  }
  if (!hires) {
    await revokeAll(deps, pending.clientId, tokens.accessToken, tokens.refreshToken);
    return { kind: "error", message: NO_HIRE_TOOL };
  }

  const now = deps.now();
  const id = await deps.sessions.create({
    handle: who.handle,
    nearAccountId: who.nearAccountId,
    emailVerified: who.emailVerified,
    scopes: tokens.scopes,
    ...sealTokens(tokens, deps.key, now),
  });
  deps.session.set(id);
  return { kind: "approved", identity: { handle: who.handle, nearAccountId: who.nearAccountId } satisfies MarketIdentity };
}

/** Best effort: a revocation that fails is logged, and the token still expires on its own. */
export async function revokeAll(deps: Pick<SignInDeps, "fetch" | "log">, clientId: string, access: string | null, refresh: string | null): Promise<void> {
  const jobs: Promise<void>[] = [];
  if (refresh) jobs.push(revokeToken(deps.fetch, clientId, refresh, "refresh_token"));
  if (access) jobs.push(revokeToken(deps.fetch, clientId, access, "access_token"));
  for (const result of await Promise.allSettled(jobs)) {
    if (result.status === "rejected") deps.log("market sign-out: revocation failed", result.reason);
  }
}

export interface TokenDeps {
  fetch: typeof fetch;
  key: Buffer;
  now: () => Date;
  clientId: () => Promise<string | null>;
  saveTokens: (sessionId: string, tokens: SealedTokens) => Promise<void>;
  market: (accessToken: string) => MarketCalls;
}

/** Refresh this long before the stated expiry, so a call doesn't start with a token about to lapse. */
const EARLY_MS = 60_000;

/**
 * Runs `work` against the market as the session's owner. The access token is refreshed first when it has expired,
 * and once more on a 401; the rotated pair is stored. A session with no refresh token that gets a 401 throws
 * MarketUnauthorized, which means the owner has to sign in again.
 */
export async function withSessionMarket<T>(deps: TokenDeps, session: StoredSession, work: (market: MarketCalls) => Promise<T>): Promise<T> {
  let current: SealedTokens = { accessTokenEnc: session.accessTokenEnc, refreshTokenEnc: session.refreshTokenEnc, accessExpiresAt: session.accessExpiresAt };
  let refreshed = false;

  const refresh = async (): Promise<string> => {
    refreshed = true;
    if (!current.refreshTokenEnc) throw new MarketUnauthorized();
    const clientId = await deps.clientId();
    if (!clientId) throw new MarketUnauthorized();
    const oldRefresh = unseal(current.refreshTokenEnc, "refresh", deps.key);
    const tokens = await refreshTokens(deps.fetch, clientId, oldRefresh);
    current = sealTokens(tokens, deps.key, deps.now(), oldRefresh);
    await deps.saveTokens(session.id, current);
    return tokens.accessToken;
  };

  const run = async (accessToken: string): Promise<T> => {
    const market = deps.market(accessToken);
    try {
      return await work(market);
    } finally {
      await market.close();
    }
  };

  const expired = current.accessExpiresAt !== null && current.accessExpiresAt.getTime() - EARLY_MS <= deps.now().getTime();
  const access = expired ? await refresh() : unseal(current.accessTokenEnc, "access", deps.key);
  try {
    return await run(access);
  } catch (error) {
    if (!(error instanceof MarketUnauthorized) || refreshed) throw error;
    return run(await refresh());
  }
}

/** The USD balance in whole cents, rounded down. null when it wasn't sent or can't be read, never zero by default. */
export function balanceCents(who: Pick<Whoami, "balances">): number | null {
  const usd = who.balances?.usd;
  if (!usd) return null;
  const match = /^(\d+)(?:\.(\d+))?$/.exec(usd.trim());
  if (!match?.[1]) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0").slice(0, 2));
  return Number.isSafeInteger(cents) ? cents : null;
}
