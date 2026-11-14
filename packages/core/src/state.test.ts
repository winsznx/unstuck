import { describe, expect, it } from "vitest";
import type { RunEvent } from "./events";
import { deriveAsks, deriveMilestone } from "./state";

const extracted: RunEvent[] = [
  { type: "ask_extracted", askId: "a1", quote: "docker build fails" },
  { type: "ask_extracted", askId: "a2", quote: "add a README" },
];

describe("deriveMilestone", () => {
  it("is reading until the base replay finishes", () => {
    expect(deriveMilestone([])).toBe("reading");
    expect(deriveMilestone(extracted)).toBe("reading");
  });

  it("is missing when any ask fails the base replay and nothing is hired", () => {
    const events: RunEvent[] = [...extracted, { type: "replay_finished", target: "base", verdicts: { a1: "missing", a2: "done" } }];
    expect(deriveMilestone(events)).toBe("missing");
  });

  it("treats unsure like missing so the owner sees it", () => {
    const events: RunEvent[] = [...extracted, { type: "replay_finished", target: "base", verdicts: { a1: "unsure", a2: "done" } }];
    expect(deriveAsks(events).get("a1")).toBe("missing");
  });

  it("walks hired, checking, ready, sent", () => {
    const events: RunEvent[] = [
      ...extracted,
      { type: "replay_finished", target: "base", verdicts: { a1: "missing", a2: "done" } },
      { type: "job_created", askId: "a1", jobId: "j1", clientRequestId: "c1" },
    ];
    expect(deriveMilestone(events)).toBe("hired");

    events.push({ type: "job_delivered", jobId: "j1" });
    expect(deriveMilestone(events)).toBe("checking");

    events.push({ type: "replay_finished", target: "patch", jobId: "j1", verdicts: { a1: "done" } });
    events.push({ type: "pr_opened", askId: "a1", url: "https://github.com/o/r/pull/1" });
    expect(deriveMilestone(events)).toBe("checking");

    events.push({ type: "reply_drafted" });
    expect(deriveMilestone(events)).toBe("ready");

    events.push({ type: "reply_sent", url: "https://github.com/o/r/issues/9#c" });
    expect(deriveMilestone(events)).toBe("sent");
  });

  it("goes back to hired after request_changes and ignores verdicts for an old job", () => {
    const events: RunEvent[] = [
      ...extracted,
      { type: "replay_finished", target: "base", verdicts: { a1: "missing", a2: "done" } },
      { type: "job_created", askId: "a1", jobId: "j1", clientRequestId: "c1" },
      { type: "job_delivered", jobId: "j1" },
      { type: "replay_finished", target: "patch", jobId: "j1", verdicts: { a1: "missing" } },
      { type: "changes_requested", jobId: "j1" },
    ];
    expect(deriveMilestone(events)).toBe("hired");

    events.push({ type: "job_created", askId: "a1", jobId: "j2", clientRequestId: "c2" });
    events.push({ type: "replay_finished", target: "patch", jobId: "j1", verdicts: { a1: "done" } });
    expect(deriveAsks(events).get("a1")).toBe("hired");
  });

  it("surfaces an escalated ask as missing", () => {
    const events: RunEvent[] = [
      ...extracted,
      { type: "replay_finished", target: "base", verdicts: { a1: "missing", a2: "done" } },
      { type: "job_created", askId: "a1", jobId: "j1", clientRequestId: "c1" },
      { type: "escalated", askId: "a1", reason: "second failed replay" },
    ];
    expect(deriveAsks(events).get("a1")).toBe("escalated");
    expect(deriveMilestone(events)).toBe("missing");
  });
});
