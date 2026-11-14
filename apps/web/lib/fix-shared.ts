/**
 * The part of the fix lifecycle that client components need. No @unstuck/core here: its barrel pulls node:crypto,
 * which can't ship to the browser.
 */

export type QueueGroup = "send" | "fix" | "fixing" | "running" | "error" | "no-checks" | "unsure" | "ready";

/** Most urgent first: something for you to post, then something for you to decide, then things in motion. */
export const QUEUE_ORDER: QueueGroup[] = ["send", "fix", "fixing", "running", "error", "no-checks", "unsure", "ready"];

export function centsLabel(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export type PartState = "done" | "current" | "later" | "skipped";

export interface PartLink {
  n: number;
  name: string;
  state: PartState;
  status: string;
  href: string;
}

export type JobStatus = "sent" | "accepted" | "working" | "delivered" | "failed" | "refunded";

export interface JobStage {
  key: JobStatus;
  label: string;
  detail: string;
  state: "done" | "current" | "later" | "stopped";
}

const STAGES: { key: JobStatus; label: string; detail: string }[] = [
  { key: "sent", label: "Sent", detail: "The brief went to the agent and the price is held, not spent." },
  { key: "accepted", label: "Accepted", detail: "The agent took the job inside its listed response time." },
  { key: "working", label: "Working", detail: "The agent reads the repo at the pinned commit and writes a change." },
  { key: "delivered", label: "Delivered", detail: "A patch came back. Part 4 reruns your reviewer's steps on it before anything else." },
];

export function jobStages(status: JobStatus): JobStage[] {
  if (status === "failed" || status === "refunded") {
    return [
      ...STAGES.slice(0, 1).map((s) => ({ ...s, state: "done" as const })),
      {
        key: status,
        label: status === "failed" ? "Didn't deliver" : "Refunded",
        detail: status === "failed" ? "The agent stopped or ran past its time. Nothing was accepted, so you pay nothing." : "The held amount went back to your Agent Market balance.",
        state: "stopped" as const,
      },
    ];
  }
  const at = STAGES.findIndex((s) => s.key === status);
  return STAGES.map((s, i) => ({ ...s, state: i < at ? "done" : i === at ? (status === "delivered" ? "done" : "current") : "later" }));
}

export const isJobStatus = (value: string): value is JobStatus => ["sent", "accepted", "working", "delivered", "failed", "refunded"].includes(value);

export interface DiffLine {
  kind: "add" | "del" | "ctx";
  text: string;
  oldNo: number | null;
  newNo: number | null;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  path: string;
  status: "added" | "deleted" | "modified" | "renamed";
  from: string | null;
  additions: number;
  deletions: number;
  binary: boolean;
  hunks: DiffHunk[];
}

const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/;
const stripPrefix = (p: string) => p.replace(/^[ab]\//, "");

/** Parses a git unified diff. Unknown lines are skipped, never guessed. */
export function parsePatch(patch: string): DiffFile[] {
  const files: DiffFile[] = [];
  let file: DiffFile | null = null;
  let hunk: DiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;

  const open = (path: string): DiffFile => {
    const next: DiffFile = { path, status: "modified", from: null, additions: 0, deletions: 0, binary: false, hunks: [] };
    files.push(next);
    hunk = null;
    return next;
  };

  for (const raw of patch.replace(/\r\n/g, "\n").split("\n")) {
    if (raw.startsWith("diff --git ")) {
      const m = /^diff --git a\/(.+) b\/(.+)$/.exec(raw);
      file = open(m?.[2] ?? raw.slice(11));
      continue;
    }
    if (raw.startsWith("--- ") && (!hunk || !file)) {
      if (!file) file = open(stripPrefix(raw.slice(4)));
      if (raw.slice(4) === "/dev/null") file.status = "added";
      continue;
    }
    if (raw.startsWith("+++ ") && file && !hunk) {
      const target = raw.slice(4);
      if (target === "/dev/null") file.status = "deleted";
      else file.path = stripPrefix(target);
      continue;
    }
    if (!file) continue;
    if (raw.startsWith("new file mode")) file.status = "added";
    else if (raw.startsWith("deleted file mode")) file.status = "deleted";
    else if (raw.startsWith("rename from ")) {
      file.status = "renamed";
      file.from = raw.slice(12);
    } else if (raw.startsWith("rename to ")) file.path = raw.slice(10);
    else if (raw.startsWith("Binary files ")) file.binary = true;
    else if (raw.startsWith("@@")) {
      const m = HUNK.exec(raw);
      if (!m) continue;
      oldNo = Number(m[1]);
      newNo = Number(m[2]);
      hunk = { header: raw, lines: [] };
      file.hunks.push(hunk);
    } else if (hunk) {
      const current: DiffHunk = hunk;
      if (raw.startsWith("+")) {
        current.lines.push({ kind: "add", text: raw.slice(1), oldNo: null, newNo: newNo++ });
        file.additions++;
      } else if (raw.startsWith("-")) {
        current.lines.push({ kind: "del", text: raw.slice(1), oldNo: oldNo++, newNo: null });
        file.deletions++;
      } else if (raw.startsWith(" ")) {
        current.lines.push({ kind: "ctx", text: raw.slice(1), oldNo: oldNo++, newNo: newNo++ });
      }
    }
  }
  return files;
}
