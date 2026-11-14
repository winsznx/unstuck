/**
 * The NEAR Agent Market account as UNSTUCK sees it. Sign-in uses the OAuth device-code grant
 * (market.near.ai advertises a device_authorization_endpoint and a "hiring" scope), so the owner
 * approves on market.near.ai and UNSTUCK never sees a password or a key.
 *
 * Nothing here is wired to market.near.ai yet: readAccount() answers signed out and the device
 * flow answers "unavailable". The types are the contract the screens are built against.
 */

export const MARKET_ORIGIN = "https://market.near.ai";
export const HIRING_SCOPE = "hiring";

export interface MarketIdentity {
  /** The account's handle on Agent Market, shown as the owner sees it there. */
  handle: string;
  /** The NEAR account the balance lives on. */
  nearAccountId: string;
}

/** Mirrors the mandates table and core's Mandate, with the fields a screen needs. */
export interface SpendingLimit {
  perHireCapCents: number;
  totalCapCents: number;
  spentCents: number;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export type HireStatus = "running" | "delivered" | "accepted" | "rejected" | "refunded" | "failed";

export interface HireRow {
  id: string;
  milestoneId: string;
  repo: string;
  agentName: string;
  priceCents: number;
  status: HireStatus;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface SignedInAccount {
  status: "signed_in";
  identity: MarketIdentity;
  /** null when the balance read failed; the screen says so instead of showing zero. */
  balanceCents: number | null;
  balanceReadAt: Date;
  scopes: string[];
  signedInAt: Date;
  limit: SpendingLimit | null;
  hires: HireRow[];
}

export type AccountView = { status: "signed_out" } | SignedInAccount;

export type DeviceFlow =
  | { kind: "idle" }
  | { kind: "unavailable"; reason: string }
  | { kind: "requesting" }
  | {
      kind: "pending";
      userCode: string;
      verificationUri: string;
      verificationUriComplete: string | null;
      expiresAt: Date;
      intervalSeconds: number;
    }
  | { kind: "approved"; identity: MarketIdentity }
  | { kind: "expired" }
  | { kind: "denied" }
  | { kind: "error"; message: string };

export const NOT_CONNECTED_REASON =
  "UNSTUCK has no Agent Market client registered in this build, so no code can be issued.";

/** Today there's no session store and no Agent Market client, so every visitor is signed out. */
export async function readAccount(): Promise<AccountView> {
  return { status: "signed_out" };
}

/* ---------- Device code ---------- */

export function secondsLeft(expiresAt: Date, now: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000));
}

export function clockOf(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Device codes read better in two halves ("WDJB-MJHT"), and that's how the owner types them. */
export function groupCode(code: string): string[] {
  const clean = code.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (clean.length < 6) return [clean];
  const half = Math.ceil(clean.length / 2);
  return [clean.slice(0, half), clean.slice(half)];
}

/* ---------- Spending limit ---------- */

export const EXPIRY_CHOICES = [7, 30, 90] as const;
export type ExpiryDays = (typeof EXPIRY_CHOICES)[number];

/** Upper bounds UNSTUCK asks for. A limit above these needs a second look, so the form refuses it. */
export const MAX_PER_HIRE_CENTS = 50_000;
export const MAX_TOTAL_CENTS = 200_000;

export interface LimitDraft {
  perHire: string;
  total: string;
  days: ExpiryDays;
}

export const DEFAULT_LIMIT: LimitDraft = { perHire: "25", total: "100", days: 30 };

export type LimitField = "perHire" | "total";

export type LimitCheck =
  | { ok: true; perHireCapCents: number; totalCapCents: number; days: ExpiryDays; hiresCovered: number }
  | { ok: false; errors: Partial<Record<LimitField, string>> };

/** "25", "25.5", "$1,250.00" -> cents. Anything else -> null. */
export function dollarsToCents(input: string): number | null {
  const clean = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [whole = "0", frac = ""] = clean.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function money(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function checkLimit(draft: LimitDraft): LimitCheck {
  const errors: Partial<Record<LimitField, string>> = {};
  const perHire = dollarsToCents(draft.perHire);
  const total = dollarsToCents(draft.total);

  if (perHire === null) errors.perHire = "Enter an amount in dollars, like 25 or 25.50.";
  else if (perHire === 0) errors.perHire = "Set at least $0.01, or no agent can be hired.";
  else if (perHire > MAX_PER_HIRE_CENTS) errors.perHire = `Keep one hire at ${money(MAX_PER_HIRE_CENTS)} or less.`;

  if (total === null) errors.total = "Enter an amount in dollars, like 100.";
  else if (total === 0) errors.total = "Set at least $0.01, or no agent can be hired.";
  else if (total > MAX_TOTAL_CENTS) errors.total = `Keep the total at ${money(MAX_TOTAL_CENTS)} or less.`;
  else if (perHire !== null && perHire > 0 && total < perHire) errors.total = `The total has to cover at least one hire, so ${money(perHire)} or more.`;

  if (perHire === null || total === null || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, perHireCapCents: perHire, totalCapCents: total, days: draft.days, hiresCovered: Math.floor(total / perHire) };
}

export function expiryFrom(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 86_400_000);
}

export interface LimitUse {
  remainingCents: number;
  /** 0..1, how much of the total is spent. */
  spentShare: number;
  daysLeft: number;
  state: "active" | "expired" | "revoked" | "used_up";
}

export function limitUse(limit: SpendingLimit, now: Date): LimitUse {
  const remainingCents = Math.max(0, limit.totalCapCents - limit.spentCents);
  const spentShare = limit.totalCapCents > 0 ? Math.min(1, limit.spentCents / limit.totalCapCents) : 1;
  const daysLeft = Math.max(0, Math.ceil((limit.expiresAt.getTime() - now.getTime()) / 86_400_000));
  const state =
    limit.revokedAt !== null && limit.revokedAt <= now
      ? "revoked"
      : limit.expiresAt <= now
        ? "expired"
        : remainingCents === 0
          ? "used_up"
          : "active";
  return { remainingCents, spentShare, daysLeft, state };
}
