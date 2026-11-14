import { claim, complete, fail, type Db, type Task } from "@unstuck/db";

export type Handler = (task: Task) => Promise<void>;

export interface LoopOptions {
  kinds: Record<string, Handler>;
  concurrency: number;
  leaseMs: number;
  idleMs: number;
  signal: AbortSignal;
  log: (line: Record<string, unknown>) => void;
}

export async function runLoop(db: Db, options: LoopOptions): Promise<void> {
  const kinds = Object.keys(options.kinds);
  const lane = async (laneId: number) => {
    while (!options.signal.aborted) {
      const task = await claim(db, kinds, options.leaseMs).catch((error: unknown) => {
        options.log({ level: "error", msg: "claim failed", lane: laneId, error: String(error) });
        return undefined;
      });
      if (!task) {
        await sleep(options.idleMs, options.signal);
        continue;
      }
      const handler = options.kinds[task.kind];
      const started = Date.now();
      try {
        if (!handler) throw new Error(`no handler for ${task.kind}`);
        await handler(task);
        await complete(db, task.id);
        options.log({ level: "info", msg: "task done", kind: task.kind, id: task.id, ms: Date.now() - started });
      } catch (error) {
        await fail(db, task, error instanceof Error ? (error.stack ?? error.message) : String(error));
        options.log({ level: "error", msg: "task failed", kind: task.kind, id: task.id, attempt: task.attempts, error: String(error) });
      }
    }
  };
  await Promise.all(Array.from({ length: options.concurrency }, (_, i) => lane(i)));
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}
