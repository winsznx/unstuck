import { describe, expect, it, vi } from "vitest";
import { DEVICE_CODE_GRANT, MARKET_OAUTH, OAuthError, pollDeviceToken, refreshTokens, registerClient, requestDeviceCode, revokeToken } from "./oauth";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function mockFetch(...responses: Response[]) {
  const fn = vi.fn<typeof fetch>();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  return fn;
}

const formOf = (fn: ReturnType<typeof mockFetch>, call = 0) => new URLSearchParams(String(fn.mock.calls[call]?.[1]?.body));

describe("registerClient", () => {
  it("registers a public device-code client and returns its id", async () => {
    const fetchFn = mockFetch(json(201, { client_id: "c-1", client_name: "UNSTUCK" }));
    expect(await registerClient(fetchFn)).toBe("c-1");
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe(MARKET_OAUTH.registrationEndpoint);
    expect(JSON.parse(String(init?.body))).toEqual({
      client_name: "UNSTUCK",
      grant_types: [DEVICE_CODE_GRANT, "refresh_token"],
      token_endpoint_auth_method: "none",
      scope: "mcp hiring profile",
    });
  });

  it("throws with the server's error when registration is refused", async () => {
    await expect(registerClient(mockFetch(json(400, { error: "invalid_client_metadata", error_description: "nope" })))).rejects.toThrow(/invalid_client_metadata: nope/);
  });
});

describe("requestDeviceCode", () => {
  it("asks for the mcp, hiring and profile scopes on the MCP resource", async () => {
    const fetchFn = mockFetch(json(200, { device_code: "dc", user_code: "WDJBMJHT", verification_uri: "https://market.near.ai/device", expires_in: 900, interval: 5 }));
    const code = await requestDeviceCode(fetchFn, "c-1");
    expect(code).toEqual({ deviceCode: "dc", userCode: "WDJBMJHT", verificationUri: "https://market.near.ai/device", verificationUriComplete: null, expiresInSeconds: 900, intervalSeconds: 5 });
    expect(fetchFn.mock.calls[0]![0]).toBe(MARKET_OAUTH.deviceAuthorizationEndpoint);
    const form = formOf(fetchFn);
    expect(form.get("client_id")).toBe("c-1");
    expect(form.get("scope")).toBe("mcp hiring profile");
    expect(form.get("resource")).toBe("https://market.near.ai/mcp");
  });

  it("defaults the interval to 5 seconds and keeps the complete URI", async () => {
    const fetchFn = mockFetch(json(200, { device_code: "dc", user_code: "AB", verification_uri: "https://m/d", verification_uri_complete: "https://m/d?c=AB", expires_in: 600 }));
    const code = await requestDeviceCode(fetchFn, "c");
    expect(code.intervalSeconds).toBe(5);
    expect(code.verificationUriComplete).toBe("https://m/d?c=AB");
  });
});

describe("pollDeviceToken", () => {
  it("returns tokens on success", async () => {
    const fetchFn = mockFetch(json(200, { access_token: "at", token_type: "Bearer", expires_in: 3600, refresh_token: "rt", scope: "mcp hiring profile" }));
    expect(await pollDeviceToken(fetchFn, "c", "dc")).toEqual({
      kind: "tokens",
      tokens: { accessToken: "at", refreshToken: "rt", expiresInSeconds: 3600, scopes: ["mcp", "hiring", "profile"] },
    });
    const form = formOf(fetchFn);
    expect(form.get("grant_type")).toBe(DEVICE_CODE_GRANT);
    expect(form.get("device_code")).toBe("dc");
  });

  it.each([
    ["authorization_pending", "pending"],
    ["slow_down", "slow_down"],
    ["access_denied", "denied"],
    ["expired_token", "expired"],
  ])("maps %s to %s", async (error, kind) => {
    expect(await pollDeviceToken(mockFetch(json(400, { error })), "c", "dc")).toEqual({ kind });
  });

  it("throws on any other error", async () => {
    await expect(pollDeviceToken(mockFetch(json(400, { error: "invalid_client" })), "c", "dc")).rejects.toBeInstanceOf(OAuthError);
  });
});

describe("refreshTokens and revokeToken", () => {
  it("refreshes with the refresh token and keeps a missing rotation as null", async () => {
    const fetchFn = mockFetch(json(200, { access_token: "at2", token_type: "Bearer", expires_in: 60 }));
    expect(await refreshTokens(fetchFn, "c", "rt")).toEqual({ accessToken: "at2", refreshToken: null, expiresInSeconds: 60, scopes: [] });
    expect(formOf(fetchFn).get("grant_type")).toBe("refresh_token");
    expect(formOf(fetchFn).get("refresh_token")).toBe("rt");
  });

  it("throws when the refresh is refused", async () => {
    await expect(refreshTokens(mockFetch(json(400, { error: "invalid_grant" })), "c", "rt")).rejects.toThrow(/invalid_grant/);
  });

  it("posts the token and its hint to the revocation endpoint", async () => {
    const fetchFn = mockFetch(new Response(null, { status: 200 }));
    await revokeToken(fetchFn, "c", "rt", "refresh_token");
    expect(fetchFn.mock.calls[0]![0]).toBe(MARKET_OAUTH.revocationEndpoint);
    expect(formOf(fetchFn).get("token_type_hint")).toBe("refresh_token");
  });
});
