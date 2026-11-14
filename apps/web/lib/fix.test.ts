import { describe, expect, it } from "vitest";
import {
  changeOf,
  compareAsks,
  CONFIRM_LINE,
  defaultPlan,
  jobStages,
  parsePatch,
  PR_LINK_GAP,
  prDraft,
  queueGroup,
  rankAgents,
  replyDraft,
  sendReadiness,
  type DraftInput,
} from "./fix";
import type { AskView, CommandResult, MilestoneView, ReplayView } from "./queries";

const step = (name: string, askId: string) => ({ name, command: `check ${name}`, network: "none" as const, timeoutMs: 1000, stopOnFail: false, askId });
const result = (n: number, exitCode: number, tail = "") => ({ step: n, name: `s${n}`, exitCode, timedOut: 0, outputTail: tail }) as CommandResult;

const run = (status: "queued" | "running" | "finished" | "error", results: CommandResult[], target: "base" | "patch" = "base"): ReplayView =>
  ({ replay: { id: `${target}-run`, status, target, steps: [step("a", "ask-1"), step("b", "ask-2")], startedAt: null, finishedAt: null, error: null }, results }) as unknown as ReplayView;

const ask = (id: string, verdict: AskView["verdict"], quote = `quote ${id}`): AskView =>
  ({ id, quote, summary: `summary ${id}`, verdict, failure: verdict === "missing" ? { step: 1, name: "s1", line: "boom", exitCode: 1, timedOut: false } : null }) as AskView;

const view = (asks: AskView[], base: ReplayView | null, patches: ReplayView[] = []) => ({ asks, base, patches }) as Pick<MilestoneView, "asks" | "base" | "patches">;

describe("changeOf", () => {
  it("names every before and after pair", () => {
    expect(changeOf("missing", "done")).toBe("fixed");
    expect(changeOf("missing", "missing")).toBe("still-missing");
    expect(changeOf("done", "missing")).toBe("broke");
    expect(changeOf("done", "done")).toBe("still-works");
    expect(changeOf("missing", "unsure")).toBe("unsure");
    expect(changeOf("missing", "open")).toBe("pending");
  });
});

describe("compareAsks", () => {
  it("judges the latest patch run per ask", () => {
    const patch = run("finished", [result(1, 0), result(2, 1, "error: still broken")], "patch");
    const changes = compareAsks(view([ask("ask-1", "missing"), ask("ask-2", "missing")], null, [patch]));
    expect(changes.map((c) => c.change)).toEqual(["fixed", "still-missing"]);
    expect(changes[1]!.after.failure?.line).toBe("error: still broken");
  });

  it("keeps every ask pending while the patch run is going", () => {
    const changes = compareAsks(view([ask("ask-1", "missing")], null, [run("running", [], "patch")]));
    expect(changes[0]!.change).toBe("pending");
  });
});

describe("sendReadiness", () => {
  const base = run("finished", [result(1, 1), result(2, 0)]);

  it("stays locked until a fix exists", () => {
    const r = sendReadiness(view([ask("ask-1", "missing"), ask("ask-2", "done")], base));
    expect(r).toMatchObject({ kind: "locked", reason: "no-fix" });
    if (r.kind === "locked") expect(r.gates.map((g) => g.met)).toEqual([true, false, false]);
  });

  it("stays locked when the fix still fails an ask", () => {
    const patch = run("finished", [result(1, 1), result(2, 0)], "patch");
    expect(sendReadiness(view([ask("ask-1", "missing"), ask("ask-2", "done")], base, [patch]))).toMatchObject({ kind: "locked", reason: "fix-fails" });
  });

  it("opens on a passing fix", () => {
    const patch = run("finished", [result(1, 0), result(2, 0)], "patch");
    expect(sendReadiness(view([ask("ask-1", "missing"), ask("ask-2", "done")], base, [patch]))).toMatchObject({ kind: "ready", source: "patch" });
  });

  it("opens on the reviewed commit when nothing is missing", () => {
    const clean = run("finished", [result(1, 0), result(2, 0)]);
    expect(sendReadiness(view([ask("ask-1", "done"), ask("ask-2", "done")], clean))).toMatchObject({ kind: "ready", source: "base" });
  });

  it("never opens without picked asks", () => {
    expect(sendReadiness(view([], base))).toMatchObject({ kind: "locked", reason: "no-asks" });
  });
});

describe("parsePatch", () => {
  const diff = [
    "diff --git a/docs/mkdocs.yml b/docs/mkdocs.yml",
    "new file mode 100644",
    "--- /dev/null",
    "+++ b/docs/mkdocs.yml",
    "@@ -0,0 +1,2 @@",
    "+site_name: canton-erc20",
    "+nav: []",
    "diff --git a/README.md b/README.md",
    "--- a/README.md",
    "+++ b/README.md",
    "@@ -3,3 +3,3 @@ intro",
    " keep",
    "-old line",
    "+new line",
    " tail",
  ].join("\n");

  it("reads files, status and line numbers", () => {
    const files = parsePatch(diff);
    expect(files.map((f) => [f.path, f.status, f.additions, f.deletions])).toEqual([
      ["docs/mkdocs.yml", "added", 2, 0],
      ["README.md", "modified", 1, 1],
    ]);
    const lines = files[1]!.hunks[0]!.lines;
    expect(lines.map((l) => [l.kind, l.oldNo, l.newNo])).toEqual([
      ["ctx", 3, 3],
      ["del", 4, null],
      ["add", null, 4],
      ["ctx", 5, 5],
    ]);
  });

  it("returns nothing for text that isn't a diff", () => {
    expect(parsePatch("hello")).toEqual([]);
  });
});

describe("drafts", () => {
  const changes = compareAsks(
    view([ask("ask-1", "missing", "Host the docs on one site.")], null, [run("finished", [result(1, 0)], "patch")]),
  );
  const input: DraftInput = {
    reviewer: "Jatinp26",
    threadUrl: "https://github.com/o/r/issues/1",
    repo: "o/code",
    sha: "5e17c9907ab8",
    program: "Canton Dev Fund",
    changes,
    source: "patch",
    runUrl: "https://u.test/runs/p",
    baseRunUrl: "https://u.test/runs/b",
    checksFor: { "ask-1": [{ n: 1, command: "ls mkdocs.yml", offline: true }] },
  };

  it("quotes the reviewer word for word and links the exact step", () => {
    const reply = replyDraft(input);
    expect(reply).toContain("> Host the docs on one site.");
    expect(reply).toContain("https://u.test/runs/p#step-1");
    expect(reply).toContain("@Jatinp26");
    expect(reply).toContain("https://u.test/runs/b");
  });

  it("leaves a marked gap for the pull request link until there is one", () => {
    expect(replyDraft(input)).toContain(PR_LINK_GAP);
    expect(replyDraft({ ...input, prUrl: "https://github.com/o/code/pull/9" })).toContain("the changes for your review are in https://github.com/o/code/pull/9.");
  });

  it("links every check when an ask has several", () => {
    // #given an ask judged by two steps
    const checks = [
      { n: 2, command: "ls docs", offline: true },
      { n: 3, command: "grep deploy .github", offline: true },
    ];
    // #when the reply is drafted
    const reply = replyDraft({ ...input, checksFor: { "ask-1": checks } });
    // #then both steps are linked
    expect(reply).toContain("All 2 checks for it now exit 0 on the fix: [step 2](https://u.test/runs/p#step-2), [step 3](https://u.test/runs/p#step-3).");
  });

  it("reports what the check did, never that the ask is fixed, and asks the reviewer to confirm", () => {
    // #given a fix whose one check passes
    // #when the reply is drafted
    const reply = replyDraft(input);
    // #then it names the command and its result, and leaves the call to the reviewer
    expect(reply).toContain("The check `ls mkdocs.yml` now exits 0 on the fix: https://u.test/runs/p#step-1");
    expect(reply).not.toMatch(/\b(fixed|done)\b/i);
    expect(reply).toContain(CONFIRM_LINE);
  });

  it("doesn't claim the network was off when a check used it", () => {
    const reply = replyDraft({ ...input, checksFor: { "ask-1": [{ n: 1, command: "curl site", offline: false }] } });
    expect(reply).not.toContain("network off");
  });

  it("builds a PR table with before and after", () => {
    const pr = prDraft(input);
    expect(pr.title).toBe("Address review: summary ask-1");
    expect(pr.body).toContain("| 1 | Host the docs on one site. | fails (exit 1) | passes ([step 1](https://u.test/runs/p#step-1)) |");
  });
});

describe("jobStages", () => {
  it("marks the stage the job is in", () => {
    expect(jobStages("working").map((s) => s.state)).toEqual(["done", "done", "current", "later"]);
    expect(jobStages("delivered").every((s) => s.state === "done")).toBe(true);
  });

  it("ends early on a failed job", () => {
    expect(jobStages("refunded").map((s) => [s.key, s.state])).toEqual([
      ["sent", "done"],
      ["refunded", "stopped"],
    ]);
  });
});

describe("agents", () => {
  const a = (id: string, delivered: number, live = true, description = "Fixes bugs in your GitHub repo") => ({
    agent_id: id,
    name: id,
    description,
    tags: [],
    listing_status: "live",
    available_now: live,
    funding_paused: false,
    delivered_jobs: delivered,
    success_rate: null,
  });

  it("puts hireable agents with a track record first", () => {
    // #given three agents that all fix code
    const agents = [a("idle", 9, false), a("new", 0), a("busy", 4)];
    // #when ranked
    const ranked = rankAgents(agents, (x) => x.available_now);
    // #then the open ones lead, busiest first
    expect(ranked.map((x) => x.agent_id)).toEqual(["busy", "new", "idle"]);
  });

  it("drops listings that don't change code", () => {
    const ranked = rankAgents([a("citations", 28, true, "Finds California code citations that changed"), a("fixer", 0)], () => true);
    expect(ranked.map((x) => x.agent_id)).toEqual(["fixer"]);
  });

  it("prefers the live default plan", () => {
    const plans = [
      { price_amount: "9", is_default: true, listing_status: "paused" },
      { price_amount: "3", is_default: false, listing_status: "live" },
    ];
    expect(defaultPlan(plans)?.price_amount).toBe("3");
  });
});

describe("queueGroup", () => {
  it("puts milestones with something missing in the fix group", () => {
    expect(queueGroup(view([ask("ask-1", "missing")], run("finished", [result(1, 1)])))).toBe("fix");
    expect(queueGroup(view([ask("ask-1", "done")], run("finished", [result(1, 0)])))).toBe("ready");
    expect(queueGroup(view([], null))).toBe("no-checks");
  });

  it("moves a milestone whose fix passes to the top as ready to send", () => {
    // #given a failing ask and a passing fix run
    const v = view([ask("ask-1", "missing")], run("finished", [result(1, 1)]), [run("finished", [result(1, 0)], "patch")]);
    // #then it's ready to send
    expect(queueGroup(v)).toBe("send");
  });

  it("counts a working agent as being fixed", () => {
    expect(queueGroup(view([ask("ask-1", "missing")], run("finished", [result(1, 1)])), "working")).toBe("fixing");
  });
});
