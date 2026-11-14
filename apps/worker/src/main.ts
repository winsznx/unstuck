import { createDb } from "@unstuck/db";
import { GitHubClient } from "@unstuck/integrations/github";
import { DockerRunner } from "@unstuck/replay";
import { loadConfig } from "./config";
import { importThread } from "@unstuck/pipeline";
import { runReplay } from "./handlers/replay";
import { runLoop } from "./loop";

const config = loadConfig();
const db = createDb(config.DATABASE_URL);
const github = new GitHubClient(config.GITHUB_TOKEN ? { token: config.GITHUB_TOKEN } : {});
const runner = new DockerRunner({ memory: config.REPLAY_MEMORY, cpus: config.REPLAY_CPUS });
const log = (line: Record<string, unknown>) => console.log(JSON.stringify({ at: new Date().toISOString(), ...line }));

const shutdown = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    log({ level: "info", msg: "shutting down", signal });
    shutdown.abort();
  });
}

log({ level: "info", msg: "worker started", replayConcurrency: config.REPLAY_CONCURRENCY });

await Promise.all([
  runLoop(db, {
    kinds: { import_thread: (task) => importThread(db, github, task.payload).then(() => undefined) },
    concurrency: 1,
    leaseMs: 2 * 60_000,
    idleMs: 2_000,
    signal: shutdown.signal,
    log,
  }),
  runLoop(db, {
    kinds: { replay: (task) => runReplay(db, runner, task.payload) },
    concurrency: config.REPLAY_CONCURRENCY,
    leaseMs: 60 * 60_000,
    idleMs: 2_000,
    signal: shutdown.signal,
    log,
  }),
]);

await db.$client.end();
