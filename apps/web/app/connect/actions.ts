"use server";

import { checkLimit, NOT_CONNECTED_REASON, type DeviceFlow, type LimitDraft } from "@/lib/account";

/**
 * Starts the device-code sign-in. Not wired: UNSTUCK has no Agent Market client yet, and registering
 * one is the owner's call, so this answers "unavailable" without calling market.near.ai.
 */
export async function startSignIn(): Promise<DeviceFlow> {
  return { kind: "unavailable", reason: NOT_CONNECTED_REASON };
}

export type SaveLimitResult = { ok: true } | { ok: false; reason: "signed_out" | "invalid"; message: string };

/** Checks the limit again on the server. It can only be saved against a signed-in account, which doesn't exist yet. */
export async function saveLimit(draft: LimitDraft): Promise<SaveLimitResult> {
  if (!checkLimit(draft).ok) return { ok: false, reason: "invalid", message: "The limit didn't pass its checks. Go back and fix the amounts." };
  return { ok: false, reason: "signed_out", message: "Sign in with Agent Market first. The limit is saved to your account, so there's nowhere to keep it yet." };
}
