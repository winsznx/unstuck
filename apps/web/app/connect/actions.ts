"use server";

import { redirect } from "next/navigation";
import { checkLimit, expiryFrom, type DeviceFlow, type LimitDraft } from "@/lib/account";
import type { SignInPoll } from "@/lib/market-auth";
import { beginSignIn, continueSignIn, currentSession, endSession, replaceMandate } from "@/lib/market-session";

/**
 * Starts the device-code sign-in. The first sign-in on a server registers UNSTUCK with Agent Market (RFC 7591) and
 * keeps the client id. The device code itself stays in a sealed httpOnly cookie; the browser only gets the user code.
 */
export async function startSignIn(): Promise<DeviceFlow> {
  return beginSignIn();
}

/** One poll of the pending sign-in. The page calls it on the interval Agent Market asked for. */
export async function pollSignIn(): Promise<SignInPoll> {
  return continueSignIn();
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/account");
}

export type SaveLimitResult = { ok: true } | { ok: false; reason: "signed_out" | "invalid"; message: string };

/** Checks the limit again on the server and saves it against the signed-in Agent Market handle, replacing the last one. */
export async function saveLimit(draft: LimitDraft): Promise<SaveLimitResult> {
  const check = checkLimit(draft);
  if (!check.ok) return { ok: false, reason: "invalid", message: "The limit didn't pass its checks. Go back and fix the amounts." };
  const session = await currentSession();
  if (!session) return { ok: false, reason: "signed_out", message: "Sign in with Agent Market first. The limit is saved to your account, and your sign-in has ended." };
  await replaceMandate(session.handle, { perHireCapCents: check.perHireCapCents, totalCapCents: check.totalCapCents, expiresAt: expiryFrom(new Date(), check.days) });
  return { ok: true };
}
