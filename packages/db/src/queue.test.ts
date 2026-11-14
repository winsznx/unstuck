import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "./client";
import { claim, complete, enqueue, fail } from "./queue";
import { tasks } from "./schema";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("task queue (needs DATABASE_URL)", () => {
  const db = createDb(url ?? "");

  beforeEach(async () => {
    await db.execute(sql`truncate ${tasks}`);
  });
  afterAll(async () => {
    await db.$client.end();
  });

  it("hands one task to exactly one of many concurrent claimers", async () => {
    await enqueue(db, "replay", { n: 1 });
    const results = await Promise.all(Array.from({ length: 8 }, () => claim(db, ["replay"], 60_000)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("reclaims a task whose lease expired, as after a crash", async () => {
    await enqueue(db, "replay", {});
    const first = await claim(db, ["replay"], 1);
    expect(first).toBeDefined();
    await new Promise((r) => setTimeout(r, 20));
    const second = await claim(db, ["replay"], 60_000);
    expect(second?.id).toBe(first?.id);
    expect(second?.attempts).toBe(2);
  });

  it("drops a duplicate open task with the same dedupe key", async () => {
    await enqueue(db, "watch", {}, { dedupeKey: "watch:1" });
    await enqueue(db, "watch", {}, { dedupeKey: "watch:1" });
    const [row] = await db.execute<{ n: number }>(sql`select count(*)::int as n from ${tasks}`);
    expect(row?.n).toBe(1);
  });

  it("allows the same dedupe key again once the first is done", async () => {
    await enqueue(db, "watch", {}, { dedupeKey: "watch:1" });
    const task = await claim(db, ["watch"], 60_000);
    await complete(db, task!.id);
    await enqueue(db, "watch", {}, { dedupeKey: "watch:1" });
    expect(await claim(db, ["watch"], 60_000)).toBeDefined();
  });

  it("backs off after a failure instead of retrying at once", async () => {
    await enqueue(db, "replay", {});
    const task = await claim(db, ["replay"], 60_000);
    await fail(db, task!, "boom");
    expect(await claim(db, ["replay"], 60_000)).toBeUndefined();
  });

  it("ignores kinds the caller doesn't handle", async () => {
    await enqueue(db, "hire", {});
    expect(await claim(db, ["replay"], 60_000)).toBeUndefined();
  });
});
