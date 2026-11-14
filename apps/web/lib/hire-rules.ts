import { checkMandate, type MandateDecision } from "@unstuck/core";
import type { SpendingLimit } from "./account";

/** Would a hire at this price go through? Same rule the worker applies before it pays. */
export function canHire(limit: SpendingLimit, priceCents: number, now: Date): MandateDecision {
  return checkMandate(
    {
      id: "view",
      perJobCapCents: limit.perHireCapCents,
      totalCapCents: limit.totalCapCents,
      spentCents: limit.spentCents,
      expiresAt: limit.expiresAt,
      revokedAt: limit.revokedAt,
    },
    priceCents,
    now,
  );
}

export const REFUSAL_TEXT: Record<Exclude<MandateDecision, { ok: true }>["reason"], string> = {
  revoked: "You turned this limit off. Set a new one to hire again.",
  expired: "This limit has expired. Set a new one to hire again.",
  over_job_cap: "This agent's price is above your per-hire limit.",
  over_total_cap: "This hire would go past what's left of your total.",
  invalid_price: "The agent's price couldn't be read, so UNSTUCK won't pay it.",
};
