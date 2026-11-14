import { createHash } from "node:crypto";

export function clientRequestId(milestoneId: string, askId: string, attempt: number): string {
  if (!Number.isSafeInteger(attempt) || attempt < 1) throw new RangeError(`attempt must be a positive integer, got ${attempt}`);
  const digest = createHash("sha256").update(`${milestoneId}\0${askId}\0${attempt}`).digest("hex");
  return `unstuck-${digest.slice(0, 32)}`;
}
