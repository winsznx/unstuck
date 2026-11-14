import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { MarketUnauthorized, type Whoami } from "@unstuck/integrations/agent-market";
import {
  balanceCents,
  NO_HIRE_TOOL,
  pollDeviceFlow,
  startDeviceFlow,
  withSessionMarket,
  type MarketCalls,
  type NewSession,
  type SignInDeps,
  type StoredSession,
  type TokenDeps,
} from "./market-auth";
import { seal, unseal } from "./market-crypto";

const key = randomBytes(32);
const NOW = new Date("2026-11-15T12:00:00Z");
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const WHO: Whoami = { handle: "ada", nearAccountId: "ada.near", emailVerified: true, emailVerificationRequired: true, balances: { usd: "42.50", creditUsd: "0", usdc: null } };

function fakeMarket(over: Partial<MarketCalls> = {}): MarketCalls & { tokens: string[] } {
  return {
    tokens: [],
    whoami: vi.fn(async () => WHO),
    canHire: vi.fn(async () => true),
    prepareJob: vi.fn(),
    jobStatus: vi.fn(),
    jobResult: vi.fn(),
    close: vi.fn(async () => undefined),
    ...over,
  };
}

function signInDeps(responses: Response[], market = fakeMarket(), storedClient: string | null = null) {
  const fetchFn = vi.fn<typeof fetch>();
  for (const r of responses) fetchFn.mockResolvedValueOnce(r);
  const jar = new Map<string, string>();
  const created: NewSession[] = [];
  const opened: string[] = [];
  const deps: SignInDeps = {
    fetch: fetchFn,
    key,
    now: () => NOW,
    clients: { find: vi.fn(async () => storedClient), save: vi.fn(async (id: string) => id) },
    device: { read: () => jar.get("device"), write: (v) => void jar.set("device", v), clear: () => void jar.delete("device") },
    sessions: {
      create: async (s) => {
        created.push(s);
        return "session-1";
      },
    },
    session: { set: (id) => void jar.set("session", id) },
    market: (token) => {
      opened.push(token);
      return market;
    },
    log: vi.fn(),
  };
  return { deps, fetchFn, jar, created, opened, market };
}

const DEVICE = { device_code: "dc-1", user_code: "WDJBMJHT", verification_uri: "https://market.near.ai/device", expires_in: 900, interval: 5 };

describe("startDeviceFlow", () => {
  it("registers once, asks for a code and keeps the device code sealed in the cookie", async () => {
    const { deps, fetchFn, jar } = signInDeps([json(201, { client_id: "c-1" }), json(200, DEVICE)]);
    const flow = await startDeviceFlow(deps);
    expect(flow).toEqual({
      kind: "pending",
      userCode: "WDJBMJHT",
      verificationUri: "https://market.near.ai/device",
      verificationUriComplete: null,
      expiresAt: new Date(NOW.getTime() + 900_000),
      intervalSeconds: 5,
    });
    expect(deps.clients.save).toHaveBeenCalledWith("c-1");
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(jar.get("device")).not.toContain("dc-1");
    expect(JSON.parse(unseal(jar.get("device")!, "device", key))).toMatchObject({ deviceCode: "dc-1", clientId: "c-1" });
  });

  it("reuses a stored client id instead of registering again", async () => {
    const { deps, fetchFn } = signInDeps([json(200, DEVICE)], fakeMarket(), "stored");
    await startDeviceFlow(deps);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(deps.clients.save).not.toHaveBeenCalled();
  });
});

async function pending(responses: Response[], market = fakeMarket()) {
  const ctx = signInDeps([json(200, DEVICE), ...responses], market, "c-1");
  await startDeviceFlow(ctx.deps);
  return ctx;
}

describe("pollDeviceFlow", () => {
  it("keeps waiting while authorization is pending", async () => {
    const { deps } = await pending([json(400, { error: "authorization_pending" })]);
    expect(await pollDeviceFlow(deps)).toEqual({ kind: "waiting", slowDown: false });
  });

  it("asks the page to slow down", async () => {
    const { deps } = await pending([json(400, { error: "slow_down" })]);
    expect(await pollDeviceFlow(deps)).toEqual({ kind: "waiting", slowDown: true });
  });

  it.each([
    ["access_denied", "denied"],
    ["expired_token", "expired"],
  ])("ends on %s and clears the device cookie", async (error, kind) => {
    const { deps, jar } = await pending([json(400, { error })]);
    expect(await pollDeviceFlow(deps)).toEqual({ kind });
    expect(jar.has("device")).toBe(false);
  });

  it("answers expired with no pending code, or a code past its time", async () => {
    const { deps } = signInDeps([]);
    expect(await pollDeviceFlow(deps)).toEqual({ kind: "expired" });
    const late = await pending([]);
    late.deps.now = () => new Date(NOW.getTime() + 901_000);
    expect(await pollDeviceFlow(late.deps)).toEqual({ kind: "expired" });
  });

  it("stores a sealed session from WHOAMI and sets the cookie on approval", async () => {
    const { deps, jar, created, opened, market } = await pending([
      json(200, { access_token: "at-1", token_type: "Bearer", expires_in: 3600, refresh_token: "rt-1", scope: "mcp hiring profile" }),
    ]);
    expect(await pollDeviceFlow(deps)).toEqual({ kind: "approved", identity: { handle: "ada", nearAccountId: "ada.near" } });
    expect(opened).toEqual(["at-1"]);
    expect(market.close).toHaveBeenCalled();
    expect(jar.get("session")).toBe("session-1");
    expect(jar.has("device")).toBe(false);
    const [session] = created;
    expect(session).toMatchObject({ handle: "ada", nearAccountId: "ada.near", emailVerified: true, scopes: ["mcp", "hiring", "profile"], accessExpiresAt: new Date(NOW.getTime() + 3_600_000) });
    expect(JSON.stringify(session)).not.toContain("at-1");
    expect(unseal(session!.accessTokenEnc, "access", key)).toBe("at-1");
    expect(unseal(session!.refreshTokenEnc!, "refresh", key)).toBe("rt-1");
  });

  it("refuses a token without the hire tool and revokes it", async () => {
    const { deps, fetchFn, created } = await pending(
      [json(200, { access_token: "at-1", token_type: "Bearer", refresh_token: "rt-1" }), new Response(null, { status: 200 }), new Response(null, { status: 200 })],
      fakeMarket({ canHire: vi.fn(async () => false) }),
    );
    expect(await pollDeviceFlow(deps)).toEqual({ kind: "error", message: NO_HIRE_TOOL });
    expect(created).toEqual([]);
    expect(fetchFn.mock.calls.filter(([url]) => String(url).endsWith("/oauth/revoke"))).toHaveLength(2);
  });
});

describe("withSessionMarket", () => {
  const session = (expiresAt: Date | null, refresh: string | null = "rt-1"): StoredSession => ({
    id: "s1",
    handle: "ada",
    nearAccountId: null,
    emailVerified: true,
    accessTokenEnc: seal("at-1", "access", key),
    refreshTokenEnc: refresh ? seal(refresh, "refresh", key) : null,
    accessExpiresAt: expiresAt,
    scopes: [],
    createdAt: NOW,
  });

  function tokenDeps(responses: Response[], behave: (token: string) => Promise<string>) {
    const fetchFn = vi.fn<typeof fetch>();
    for (const r of responses) fetchFn.mockResolvedValueOnce(r);
    const saved: unknown[] = [];
    const used: string[] = [];
    const deps: TokenDeps = {
      fetch: fetchFn,
      key,
      now: () => NOW,
      clientId: async () => "c-1",
      saveTokens: async (_id, tokens) => void saved.push(tokens),
      market: (token) => {
        used.push(token);
        return fakeMarket({ whoami: async () => ({ ...WHO, handle: await behave(token) }) });
      },
    };
    return { deps, fetchFn, saved, used };
  }

  const refreshed = () => json(200, { access_token: "at-2", token_type: "Bearer", expires_in: 3600, refresh_token: "rt-2" });

  it("uses a live token as is", async () => {
    const { deps, fetchFn } = tokenDeps([], async () => "ada");
    expect(await withSessionMarket(deps, session(new Date(NOW.getTime() + 3_600_000)), (m) => m.whoami())).toMatchObject({ handle: "ada" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("refreshes an expired token first and stores the rotated pair", async () => {
    const { deps, saved, used } = tokenDeps([refreshed()], async () => "ada");
    await withSessionMarket(deps, session(new Date(NOW.getTime() - 1)), (m) => m.whoami());
    expect(used).toEqual(["at-2"]);
    const [tokens] = saved as { accessTokenEnc: string; refreshTokenEnc: string }[];
    expect(unseal(tokens!.accessTokenEnc, "access", key)).toBe("at-2");
    expect(unseal(tokens!.refreshTokenEnc, "refresh", key)).toBe("rt-2");
  });

  it("refreshes once on a 401 and retries", async () => {
    const { deps, used } = tokenDeps([refreshed()], async (token) => {
      if (token === "at-1") throw new MarketUnauthorized();
      return "ada";
    });
    await withSessionMarket(deps, session(null), (m) => m.whoami());
    expect(used).toEqual(["at-1", "at-2"]);
  });

  it("gives up after the refreshed token is refused too", async () => {
    const { deps, used } = tokenDeps([refreshed()], async () => {
      throw new MarketUnauthorized();
    });
    await expect(withSessionMarket(deps, session(null), (m) => m.whoami())).rejects.toBeInstanceOf(MarketUnauthorized);
    expect(used).toEqual(["at-1", "at-2"]);
  });

  it("can't refresh without a refresh token", async () => {
    const { deps } = tokenDeps([], async () => {
      throw new MarketUnauthorized();
    });
    await expect(withSessionMarket(deps, session(null, null), (m) => m.whoami())).rejects.toBeInstanceOf(MarketUnauthorized);
  });
});

describe("balanceCents", () => {
  it("reads the USD balance in cents and rounds down", () => {
    expect(balanceCents({ balances: { usd: "42.509", creditUsd: null, usdc: null } })).toBe(4250);
  });

  it("is null, never zero, when the balance is missing or unreadable", () => {
    expect(balanceCents({ balances: null })).toBeNull();
    expect(balanceCents({ balances: { usd: null, creditUsd: "1", usdc: null } })).toBeNull();
    expect(balanceCents({ balances: { usd: "n/a", creditUsd: null, usdc: null } })).toBeNull();
  });
});
