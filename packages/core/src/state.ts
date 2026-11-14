import type { AskVerdict, RunEvent } from "./events";

export type AskState = "reading" | "done" | "missing" | "hired" | "checking" | "fixed" | "escalated";

export type MilestoneState = "reading" | "missing" | "hired" | "checking" | "ready" | "sent";

interface AskRecord {
  baseVerdict?: AskVerdict;
  activeJobId?: string;
  delivered: boolean;
  patchPassed: boolean;
  escalated: boolean;
  prOpened: boolean;
}

export function deriveAsks(events: readonly RunEvent[]): Map<string, AskState> {
  const asks = new Map<string, AskRecord>();
  const askByJob = new Map<string, string>();
  const record = (askId: string): AskRecord | undefined => asks.get(askId);

  for (const event of events) {
    switch (event.type) {
      case "ask_extracted":
        asks.set(event.askId, { delivered: false, patchPassed: false, escalated: false, prOpened: false });
        break;
      case "replay_finished":
        for (const [askId, verdict] of Object.entries(event.verdicts)) {
          const ask = record(askId);
          if (!ask) continue;
          if (event.target === "base") ask.baseVerdict = verdict;
          else if (event.jobId !== undefined && event.jobId === ask.activeJobId) ask.patchPassed = verdict === "done";
        }
        break;
      case "job_created": {
        const ask = record(event.askId);
        if (!ask) break;
        ask.activeJobId = event.jobId;
        ask.delivered = false;
        ask.patchPassed = false;
        askByJob.set(event.jobId, event.askId);
        break;
      }
      case "job_delivered":
      case "changes_requested": {
        const askId = askByJob.get(event.jobId);
        const ask = askId === undefined ? undefined : record(askId);
        if (!ask || ask.activeJobId !== event.jobId) break;
        ask.delivered = event.type === "job_delivered";
        ask.patchPassed = false;
        break;
      }
      case "escalated": {
        const ask = record(event.askId);
        if (ask) ask.escalated = true;
        break;
      }
      case "pr_opened": {
        const ask = record(event.askId);
        if (ask) ask.prOpened = true;
        break;
      }
      case "reply_drafted":
      case "reply_sent":
        break;
    }
  }

  const states = new Map<string, AskState>();
  for (const [askId, ask] of asks) states.set(askId, askState(ask));
  return states;
}

function askState(ask: AskRecord): AskState {
  if (ask.baseVerdict === undefined) return "reading";
  if (ask.baseVerdict === "done") return "done";
  if (ask.escalated) return "escalated";
  if (ask.activeJobId === undefined) return "missing";
  if (!ask.delivered) return "hired";
  if (ask.patchPassed && ask.prOpened) return "fixed";
  return "checking";
}

const progress: readonly AskState[] = ["reading", "missing", "escalated", "hired", "checking", "fixed", "done"];

export function deriveMilestone(events: readonly RunEvent[]): MilestoneState {
  if (events.some((e) => e.type === "reply_sent")) return "sent";
  const asks = [...deriveAsks(events).values()];
  if (asks.length === 0) return "reading";

  const least = asks.reduce((a, b) => (progress.indexOf(a) <= progress.indexOf(b) ? a : b));
  switch (least) {
    case "reading":
      return "reading";
    case "missing":
    case "escalated":
      return "missing";
    case "hired":
      return "hired";
    case "checking":
      return "checking";
    case "fixed":
    case "done":
      return events.some((e) => e.type === "reply_drafted") ? "ready" : "checking";
  }
}
