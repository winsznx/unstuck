import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { commandResults, createDb, enqueue, milestones, replays } from "@unstuck/db";
import { loadConfig } from "./config";

const usage = `usage:
  cli import <thread-url> [--comment <id>] [--code-repo <url>]
  cli replay <milestone-id> --image <image> --step "<name>::<command>[::net]" [--step ...] [--patch-stdin < fix.patch]
  cli show <milestone-id>`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    comment: { type: "string" },
    "code-repo": { type: "string" },
    image: { type: "string" },
    step: { type: "string", multiple: true },
    "patch-stdin": { type: "boolean" },
  },
});

const db = createDb(loadConfig().DATABASE_URL);
const [command, target] = positionals;

try {
  if (command === "import" && target) {
    await enqueue(db, "import_thread", {
      threadUrl: target,
      ...(values.comment ? { commentId: values.comment } : {}),
      ...(values["code-repo"] ? { codeRepoUrl: values["code-repo"] } : {}),
    });
    console.log("queued import_thread");
  } else if (command === "replay" && target && values.image && values.step?.length) {
    const milestone = await db.query.milestones.findFirst({ where: eq(milestones.id, target) });
    if (!milestone?.pinnedSha) throw new Error("milestone not found or has no pinned sha");
    const steps = values.step.map((raw) => {
      const [name, cmd, net] = raw.split("::");
      if (!name || !cmd) throw new Error(`bad --step: ${raw}`);
      return { name, command: cmd, network: net === "net" ? ("bridge" as const) : ("none" as const), timeoutMs: 10 * 60_000, stopOnFail: false };
    });
    const patch = values["patch-stdin"] ? await readStdin() : null;
    if (patch !== null && patch.trim() === "") throw new Error("--patch-stdin given but stdin was empty");
    const [row] = await db
      .insert(replays)
      .values({ milestoneId: target, target: patch ? "patch" : "base", sha: milestone.pinnedSha, image: values.image, steps, patch })
      .returning({ id: replays.id });
    await enqueue(db, "replay", { replayId: row!.id }, { dedupeKey: `replay:${row!.id}` });
    console.log(`queued replay ${row!.id}`);
  } else if (command === "show" && target) {
    const milestone = await db.query.milestones.findFirst({ where: eq(milestones.id, target) });
    console.log(JSON.stringify(milestone, null, 2));
    for (const replay of await db.query.replays.findMany({ where: eq(replays.milestoneId, target) })) {
      console.log(`\nreplay ${replay.id} ${replay.target} ${replay.status} ${replay.error ?? ""}`);
      const results = await db.query.commandResults.findMany({ where: eq(commandResults.replayId, replay.id) });
      for (const r of results.sort((a, b) => a.step - b.step)) {
        console.log(`  [${r.step}] ${r.name}: exit=${r.exitCode} timedOut=${r.timedOut} ${r.durationMs}ms sha256=${r.outputSha256.slice(0, 12)}`);
        console.log(r.outputTail.trimEnd().split("\n").slice(-6).map((l) => `      ${l}`).join("\n"));
      }
    }
  } else {
    console.error(usage);
    process.exitCode = 2;
  }
} finally {
  await db.$client.end();
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}
