import type { AskView, CommandResult, Milestone, MilestoneView, Replay } from "./queries";

/**
 * Made-up milestones for the /dev/preview gallery and for tests. Every name and number here is fictional:
 * nothing built from this module may be shown outside /dev.
 */
export type SampleState = "queued" | "running" | "missing" | "works" | "mixed" | "error" | "no-checks";

export const SAMPLE_BODY = [
  "Thanks for the delivery. Two things before we can approve this milestone:",
  "",
  "- The docs aren't published anywhere. Please host them on one site so the committee can verify the guides.",
  "- `pnpm test` fails on a clean clone, the `fixtures/` folder seems to be missing.",
  "",
  "Ping me here once both are fixed and I'll take another look. cc @grant-lead",
].join("\n");

const QUOTES = [
  "Please host them on one site so the committee can verify the guides.",
  "`pnpm test` fails on a clean clone, the `fixtures/` folder seems to be missing.",
] as const;

const T0 = new Date("2026-10-21T09:30:00Z");
const RUN_AT = new Date("2026-11-06T12:00:00Z");
const SHA = "4b1d9e07c2a8f3b6d5e4c3b2a1f0e9d8c7b6a5f4";

export const SAMPLE_MILESTONE: Milestone = {
  id: "00000000-0000-4000-8000-00000000a001",
  threadUrl: "https://github.com/example-fund/grants/issues/42",
  threadRepo: "example-fund/grants",
  codeRepoUrl: "https://github.com/example-org/grant-sdk",
  pinnedSha: SHA,
  reviewerCommentId: "IC_sample",
  reviewerCommentBody: SAMPLE_BODY,
  reviewerLogin: "sample-reviewer",
  reviewerCommentAt: T0,
  reviewerCommentUrl: "https://github.com/example-fund/grants/issues/42#issuecomment-1",
  threadTitle: "Grant SDK, milestone 2 delivery",
  ownerLogin: "example-org",
  createdAt: RUN_AT,
};

function ask(i: 0 | 1, verdict: AskView["verdict"], failure: AskView["failure"]): AskView {
  const quote = QUOTES[i];
  return {
    id: `00000000-0000-4000-8000-00000000b00${i + 1}`,
    milestoneId: SAMPLE_MILESTONE.id,
    quote,
    summary: quote,
    severity: "blocks_payment",
    source: "owner",
    quoteStart: SAMPLE_BODY.indexOf(quote),
    createdAt: RUN_AT,
    verdict,
    failure,
  };
}

const STEPS: Replay["steps"] = [
  { name: "docs site is configured", command: "ls mkdocs.yml docusaurus.config.js book.toml 2>/dev/null | grep .", network: "none", timeoutMs: 60_000, stopOnFail: false, askId: "00000000-0000-4000-8000-00000000b001" },
  { name: "tests pass on a clean clone", command: "pnpm test", network: "none", timeoutMs: 300_000, stopOnFail: false, askId: "00000000-0000-4000-8000-00000000b002" },
];

function result(step: number, name: string, command: string, exitCode: number, output: string, durationMs: number): CommandResult {
  return {
    id: step + 1,
    replayId: "00000000-0000-4000-8000-00000000c001",
    step,
    name,
    command,
    network: step === 0 ? "bridge" : "none",
    exitCode,
    timedOut: 0,
    durationMs,
    outputTail: output,
    outputSha256: "9f2c1e0d4b7a6c5e8f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f70",
    outputBytes: output.length,
  };
}

const CHECKOUT = result(0, "checkout", `checkout ${SAMPLE_MILESTONE.codeRepoUrl}@${SHA}`, 0, `HEAD is now at ${SHA.slice(0, 7)}`, 3_200);
const DOCS_FAIL = result(1, STEPS[0]?.name ?? "", STEPS[0]?.command ?? "", 1, "error: no docs site config found (mkdocs, docusaurus, mdbook)", 190);
const DOCS_PASS = result(1, STEPS[0]?.name ?? "", STEPS[0]?.command ?? "", 0, "mkdocs.yml", 180);
const TEST_FAIL = result(2, STEPS[1]?.name ?? "", STEPS[1]?.command ?? "", 1, "FAIL src/parse.test.ts\nError: ENOENT: no such file or directory, open 'fixtures/block.json'", 8_400);
const TEST_PASS = result(2, STEPS[1]?.name ?? "", STEPS[1]?.command ?? "", 0, "Test Files  12 passed (12)\n     Tests  148 passed (148)", 9_100);

const DOCS_FAILURE: AskView["failure"] = { step: 1, name: DOCS_FAIL.name, line: "error: no docs site config found (mkdocs, docusaurus, mdbook)", exitCode: 1, timedOut: false };
const TEST_FAILURE: AskView["failure"] = { step: 2, name: TEST_FAIL.name, line: "Error: ENOENT: no such file or directory, open 'fixtures/block.json'", exitCode: 1, timedOut: false };

function replay(status: Replay["status"], steps: Replay["steps"], error: string | null = null): Replay {
  return {
    id: "00000000-0000-4000-8000-00000000c001",
    milestoneId: SAMPLE_MILESTONE.id,
    target: "base",
    jobId: null,
    sha: SHA,
    image: "node:22-alpine",
    steps,
    patch: null,
    status,
    error,
    startedAt: status === "queued" ? null : RUN_AT,
    finishedAt: status === "finished" || status === "error" ? new Date(RUN_AT.getTime() + 12_000) : null,
    createdAt: RUN_AT,
  };
}

export function sampleView(state: SampleState): MilestoneView {
  const base = (r: Replay, results: CommandResult[]) => ({ replay: r, results });
  const view = (asks: AskView[], b: MilestoneView["base"]): MilestoneView => ({ milestone: SAMPLE_MILESTONE, asks, base: b, patches: [] });
  switch (state) {
    case "queued":
      return view([ask(0, "open", null), ask(1, "open", null)], base(replay("queued", STEPS), []));
    case "running":
      return view([ask(0, "open", null), ask(1, "open", null)], base(replay("running", STEPS), [CHECKOUT, DOCS_FAIL]));
    case "missing":
      return view([ask(0, "missing", DOCS_FAILURE), ask(1, "missing", TEST_FAILURE)], base(replay("finished", STEPS), [CHECKOUT, DOCS_FAIL, TEST_FAIL]));
    case "works":
      return view([ask(0, "done", null), ask(1, "done", null)], base(replay("finished", STEPS), [CHECKOUT, DOCS_PASS, TEST_PASS]));
    case "mixed":
      return view([ask(0, "missing", DOCS_FAILURE), ask(1, "done", null)], base(replay("finished", STEPS), [CHECKOUT, DOCS_FAIL, TEST_PASS]));
    case "error":
      return view([ask(0, "open", null), ask(1, "open", null)], base(replay("error", STEPS, "checkout failed: repository not found"), []));
    case "no-checks":
      return view([ask(0, "open", null)], null);
  }
}
