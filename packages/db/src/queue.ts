import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db, Executor } from "./client";
import { tasks } from "./schema";

export type Task = typeof tasks.$inferSelect;

export async function enqueue(
  db: Executor,
  kind: string,
  payload: Record<string, unknown>,
  options: { dedupeKey?: string; runAfter?: Date; maxAttempts?: number } = {},
): Promise<void> {
  await db
    .insert(tasks)
    .values({ kind, payload, dedupeKey: options.dedupeKey ?? null, runAfter: options.runAfter ?? new Date(), maxAttempts: options.maxAttempts ?? 5 })
    .onConflictDoNothing();
}

export async function claim(db: Db, kinds: readonly string[], leaseMs: number): Promise<Task | undefined> {
  const kindList = sql.join(kinds.map((k) => sql`${k}`), sql`, `);
  const rows = await db.execute<{ id: number }>(sql`
    update ${tasks} set lease_until = now() + ${`${leaseMs} milliseconds`}::interval, attempts = attempts + 1
    where id = (
      select id from ${tasks}
      where done_at is null and run_after <= now() and attempts < max_attempts
        and (lease_until is null or lease_until < now()) and kind in (${kindList})
      order by run_after
      for update skip locked
      limit 1
    )
    returning id`);
  const id = rows[0]?.id;
  if (id === undefined) return undefined;
  return db.query.tasks.findFirst({ where: eq(tasks.id, Number(id)) });
}

export async function complete(db: Db, id: number): Promise<void> {
  await db.update(tasks).set({ doneAt: new Date(), leaseUntil: null, lastError: null }).where(eq(tasks.id, id));
}

export async function fail(db: Db, task: Task, error: string): Promise<void> {
  const backoffMs = Math.min(60_000 * 2 ** (task.attempts - 1), 30 * 60_000);
  await db
    .update(tasks)
    .set({ lastError: error.slice(0, 4000), leaseUntil: null, runAfter: new Date(Date.now() + backoffMs) })
    .where(eq(tasks.id, task.id));
}

export async function deadLetters(db: Db): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(and(isNull(tasks.doneAt), sql`${tasks.attempts} >= ${tasks.maxAttempts}`));
}
