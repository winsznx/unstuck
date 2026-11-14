import "server-only";
import { NearAi } from "@unstuck/integrations/near-ai";

/** NEAR AI Cloud, or null when no key is set, so every caller has a plain path without it. */
export function nearAi(): NearAi | null {
  const apiKey = process.env.NEAR_AI_API_KEY?.trim();
  if (!apiKey) return null;
  const model = process.env.NEAR_AI_MODEL?.trim();
  return new NearAi({ apiKey, ...(model ? { model } : {}) });
}
