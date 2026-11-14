import "server-only";
import { createDb, type Db } from "@unstuck/db";

const globalForDb = globalThis as unknown as { unstuckDb?: Db };

export function db(): Db {
  if (!globalForDb.unstuckDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.unstuckDb = createDb(url);
  }
  return globalForDb.unstuckDb;
}
