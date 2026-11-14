export interface Mandate {
  id: string;
  perJobCapCents: number;
  totalCapCents: number;
  spentCents: number;
  expiresAt: Date;
  revokedAt: Date | null;
}

export type MandateDecision =
  | { ok: true }
  | { ok: false; reason: "revoked" | "expired" | "over_job_cap" | "over_total_cap" | "invalid_price" };

export function checkMandate(mandate: Mandate, priceCents: number, now: Date): MandateDecision {
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0) return { ok: false, reason: "invalid_price" };
  if (mandate.revokedAt !== null && mandate.revokedAt <= now) return { ok: false, reason: "revoked" };
  if (mandate.expiresAt <= now) return { ok: false, reason: "expired" };
  if (priceCents > mandate.perJobCapCents) return { ok: false, reason: "over_job_cap" };
  if (mandate.spentCents + priceCents > mandate.totalCapCents) return { ok: false, reason: "over_total_cap" };
  return { ok: true };
}
