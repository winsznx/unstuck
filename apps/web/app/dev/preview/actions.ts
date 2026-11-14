"use server";

import type { HireResult } from "@/app/m/actions";

/** Stands in for the real hire action on the preview page. It never reaches Agent Market. */
export async function sampleHire(_prev: HireResult, form: FormData): Promise<HireResult> {
  if (process.env.NODE_ENV === "production") return { kind: "invalid", message: "Preview only." };
  return { kind: "checkout", url: "https://market.near.ai", agentName: String(form.get("agentName") ?? "Sample agent"), priceCents: 1_200 };
}
