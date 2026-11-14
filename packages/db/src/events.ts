import { asc, eq } from "drizzle-orm";
import type { RunEvent } from "@unstuck/core";
import type { Db } from "./client";
import { runEvents } from "./schema";

export async function appendEvent(db: Db, milestoneId: string, event: RunEvent): Promise<void> {
  await db.insert(runEvents).values({ milestoneId, event });
}

export async function loadEvents(db: Db, milestoneId: string): Promise<RunEvent[]> {
  const rows = await db.select({ event: runEvents.event }).from(runEvents).where(eq(runEvents.milestoneId, milestoneId)).orderBy(asc(runEvents.id));
  return rows.map((r) => r.event);
}
