import "server-only";

/** The grantee's NEAR Agent Market account as the header shows it. */
export type MarketAccount = { state: "signed-out" } | { state: "signed-in"; handle: string; balanceCents: number | null };

/**
 * The header's read of the Agent Market session. Sign-in (the device-code grant at /connect) isn't wired yet, so
 * every visitor is signed out. When the session store lands, this is the one place to read it.
 */
export async function readMarketAccount(): Promise<MarketAccount> {
  return { state: "signed-out" };
}
