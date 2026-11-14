import { z } from "zod";

/**
 * Agent Market's OAuth server, as its /.well-known/oauth-authorization-server document advertises it. UNSTUCK is a
 * public client (no secret, PKCE-capable) that registers itself once per issuer and signs owners in with the
 * device-code grant (RFC 8628).
 */
export const MARKET_OAUTH = {
  issuer: "https://market.near.ai",
  registrationEndpoint: "https://market.near.ai/oauth/register",
  deviceAuthorizationEndpoint: "https://market.near.ai/oauth/device/code",
  tokenEndpoint: "https://market.near.ai/oauth/token",
  revocationEndpoint: "https://market.near.ai/oauth/revoke",
  resource: "https://market.near.ai/mcp",
  scope: "mcp hiring profile",
} as const;

export const DEVICE_CODE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";

export type Fetch = typeof fetch;

export class OAuthError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
    readonly error: string | null,
    description: string | null,
  ) {
    super(`Agent Market ${endpoint} answered ${status}${error ? ` ${error}` : ""}${description ? `: ${description}` : ""}`);
    this.name = "OAuthError";
  }
}

const errorBody = z.object({ error: z.string(), error_description: z.string().optional() });

async function postForm(fetchFn: Fetch, url: string, body: Record<string, string>): Promise<Response> {
  return fetchFn(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams(body).toString(),
  });
}

async function failure(endpoint: string, response: Response): Promise<OAuthError> {
  const parsed = errorBody.safeParse(await response.json().catch(() => null));
  return new OAuthError(endpoint, response.status, parsed.success ? parsed.data.error : null, parsed.success ? (parsed.data.error_description ?? null) : null);
}

const registration = z.object({ client_id: z.string().min(1) });

/** RFC 7591 dynamic registration. The answer's client_id is kept and reused; there's no secret to keep. */
export async function registerClient(fetchFn: Fetch, clientName = "UNSTUCK"): Promise<string> {
  const response = await fetchFn(MARKET_OAUTH.registrationEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_name: clientName,
      grant_types: [DEVICE_CODE_GRANT, "refresh_token"],
      token_endpoint_auth_method: "none",
      scope: MARKET_OAUTH.scope,
    }),
  });
  if (!response.ok) throw await failure("registration", response);
  return registration.parse(await response.json()).client_id;
}

const deviceCode = z.object({
  device_code: z.string().min(1),
  user_code: z.string().min(1),
  verification_uri: z.string().url(),
  verification_uri_complete: z.string().url().optional(),
  expires_in: z.number().positive(),
  interval: z.number().positive().optional(),
});

export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string | null;
  expiresInSeconds: number;
  intervalSeconds: number;
}

/** RFC 8628 section 3.1. The spec's default poll interval is 5 seconds when the server names none. */
export async function requestDeviceCode(fetchFn: Fetch, clientId: string): Promise<DeviceCode> {
  const response = await postForm(fetchFn, MARKET_OAUTH.deviceAuthorizationEndpoint, { client_id: clientId, scope: MARKET_OAUTH.scope, resource: MARKET_OAUTH.resource });
  if (!response.ok) throw await failure("device authorization", response);
  const body = deviceCode.parse(await response.json());
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUri: body.verification_uri,
    verificationUriComplete: body.verification_uri_complete ?? null,
    expiresInSeconds: body.expires_in,
    intervalSeconds: body.interval ?? 5,
  };
}

const tokenBody = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  expires_in: z.number().positive().optional(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
});

export interface TokenSet {
  accessToken: string;
  /** Absent when the server doesn't rotate it; the caller keeps the one it had. */
  refreshToken: string | null;
  expiresInSeconds: number | null;
  scopes: string[];
}

function tokenSet(body: z.infer<typeof tokenBody>): TokenSet {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? null,
    expiresInSeconds: body.expires_in ?? null,
    scopes: body.scope ? body.scope.split(" ").filter(Boolean) : [],
  };
}

export type DevicePoll =
  | { kind: "tokens"; tokens: TokenSet }
  | { kind: "pending" }
  | { kind: "slow_down" }
  | { kind: "denied" }
  | { kind: "expired" };

/** One poll of the token endpoint (RFC 8628 section 3.4). Errors outside the four the spec names throw. */
export async function pollDeviceToken(fetchFn: Fetch, clientId: string, code: string): Promise<DevicePoll> {
  const response = await postForm(fetchFn, MARKET_OAUTH.tokenEndpoint, { grant_type: DEVICE_CODE_GRANT, device_code: code, client_id: clientId });
  if (response.ok) return { kind: "tokens", tokens: tokenSet(tokenBody.parse(await response.json())) };
  const error = await failure("token", response);
  switch (error.error) {
    case "authorization_pending":
      return { kind: "pending" };
    case "slow_down":
      return { kind: "slow_down" };
    case "access_denied":
      return { kind: "denied" };
    case "expired_token":
      return { kind: "expired" };
    default:
      throw error;
  }
}

export async function refreshTokens(fetchFn: Fetch, clientId: string, refreshToken: string): Promise<TokenSet> {
  const response = await postForm(fetchFn, MARKET_OAUTH.tokenEndpoint, { grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId, resource: MARKET_OAUTH.resource });
  if (!response.ok) throw await failure("token refresh", response);
  return tokenSet(tokenBody.parse(await response.json()));
}

/** RFC 7009. The server answers 200 for a token it doesn't know too, so only a transport or 5xx failure throws. */
export async function revokeToken(fetchFn: Fetch, clientId: string, token: string, hint: "access_token" | "refresh_token"): Promise<void> {
  const response = await postForm(fetchFn, MARKET_OAUTH.revocationEndpoint, { token, token_type_hint: hint, client_id: clientId });
  if (!response.ok) throw await failure("revocation", response);
}
