import "server-only";

/** The grantee's NEAR Agent Market account as the header shows it. */
export type MarketAccount = { state: "signed-out" } | { state: "signed-in"; handle: string; balanceCents: number | null };

/**
 * The header's read of the Agent Market session. It doesn't read the session cookie, on purpose, so pages stay
 * static, and every visitor gets the signed-out chip that points to /connect. The signed-in account lives at /account.
 */
export async function readMarketAccount(): Promise<MarketAccount> {
  return { state: "signed-out" };
}
