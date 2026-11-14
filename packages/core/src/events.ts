export type AskVerdict = "done" | "missing" | "unsure";

export type RunEvent =
  | { type: "ask_extracted"; askId: string; quote: string }
  | { type: "replay_finished"; target: "base" | "patch"; jobId?: string; verdicts: Record<string, AskVerdict> }
  | { type: "job_created"; askId: string; jobId: string; clientRequestId: string }
  | { type: "job_delivered"; jobId: string }
  | { type: "changes_requested"; jobId: string }
  | { type: "escalated"; askId: string; reason: string }
  | { type: "pr_opened"; askId: string; url: string }
  | { type: "reply_drafted" }
  | { type: "reply_sent"; url: string };
