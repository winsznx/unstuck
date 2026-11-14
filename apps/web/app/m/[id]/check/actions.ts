"use server";

import { redirect } from "next/navigation";
import { startFixCheck } from "@/lib/fix-check";

export interface CheckFixState {
  error: string | null;
}

export async function checkFix(milestoneId: string, _previous: CheckFixState, form: FormData): Promise<CheckFixState> {
  const result = await startFixCheck(milestoneId, String(form.get("fix") ?? ""));
  if (!result.ok) return { error: result.error };
  redirect(`/m/${milestoneId}/check`);
}
