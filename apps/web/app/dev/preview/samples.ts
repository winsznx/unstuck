import type { MilestoneSummary } from "@/app/m/actions";
import type { AgentCardProps } from "@/components/fix/agent-card";
import type { HireRow, MarketIdentity, SignedInAccount, SpendingLimit } from "@/lib/account";
import type { AskChange } from "@/lib/fix";
import { SAMPLE_MILESTONE, sampleView } from "@/lib/sample";

/** Fictional data for the preview page only. See lib/sample.ts for the milestone it's built around. */

export const NOW = new Date("2026-11-06T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const IDENTITY: MarketIdentity = { handle: "sample-grantee", nearAccountId: "sample-grantee.near" };

export const LIMITS: { label: string; limit: SpendingLimit }[] = [
  { label: "Active, a quarter used", limit: { perHireCapCents: 2_500, totalCapCents: 10_000, spentCents: 2_500, expiresAt: days(24), revokedAt: null, createdAt: days(-6) } },
  { label: "Active, nearly used up", limit: { perHireCapCents: 2_500, totalCapCents: 10_000, spentCents: 9_000, expiresAt: days(3), revokedAt: null, createdAt: days(-27) } },
  { label: "Ended", limit: { perHireCapCents: 2_500, totalCapCents: 10_000, spentCents: 4_000, expiresAt: days(-1), revokedAt: null, createdAt: days(-31) } },
  { label: "Turned off", limit: { perHireCapCents: 2_500, totalCapCents: 10_000, spentCents: 0, expiresAt: days(20), revokedAt: days(-1), createdAt: days(-10) } },
];

const hire = (id: string, status: HireRow["status"], agentName: string, priceCents: number, startedDaysAgo: number, finished: boolean): HireRow => ({
  id,
  milestoneId: SAMPLE_MILESTONE.id,
  repo: "example-org/grant-sdk",
  agentName,
  priceCents,
  status,
  startedAt: days(-startedDaysAgo),
  finishedAt: finished ? days(-startedDaysAgo + 1) : null,
});

export const HIRES: HireRow[] = [
  hire("h1", "running", "Docs Mason", 1_200, 0, false),
  hire("h2", "delivered", "Test Fixer", 1_800, 1, true),
  hire("h3", "accepted", "Docs Mason", 1_200, 4, true),
  hire("h4", "rejected", "Patchwork", 900, 6, true),
  hire("h5", "refunded", "Patchwork", 900, 8, true),
  hire("h6", "failed", "Quickfix", 500, 9, true),
];

export const ACCOUNT: SignedInAccount = {
  status: "signed_in",
  identity: IDENTITY,
  balanceCents: 4_250,
  balanceReadAt: NOW,
  scopes: ["hiring"],
  signedInAt: days(-6),
  limit: LIMITS[0]?.limit ?? null,
  hires: HIRES,
};

export const AGENTS: { label: string; props: AgentCardProps }[] = [
  {
    label: "Hireable, picked",
    props: {
      id: "a1",
      name: "Docs Mason",
      handle: "docs-mason",
      description: "Sets up and publishes documentation sites from existing markdown.",
      builder: "sample-builder",
      verified: true,
      deliveredJobs: 41,
      successRate: 0.93,
      slaSeconds: 7_200,
      payableWith: ["USDC"],
      priceCents: 1_200,
      planName: "Per fix",
      hireable: true,
      selected: true,
    },
  },
  {
    label: "Hireable, not picked, no track record",
    props: {
      id: "a2",
      name: "Test Fixer",
      handle: "test-fixer",
      description: null,
      builder: null,
      verified: false,
      deliveredJobs: 0,
      successRate: null,
      slaSeconds: null,
      payableWith: ["USDC", "NEAR"],
      priceCents: 1_800,
      planName: null,
      hireable: true,
      selected: false,
    },
  },
  {
    label: "Not hireable, no listed price",
    props: {
      id: "a3",
      name: "Patchwork",
      handle: "patchwork",
      description: "General code changes.",
      builder: "sample-builder",
      verified: true,
      deliveredJobs: 12,
      successRate: 0.58,
      slaSeconds: 86_400,
      payableWith: [],
      priceCents: null,
      planName: null,
      hireable: false,
      selected: false,
    },
  },
];

export function askChanges(): AskChange[] {
  const [docs, tests] = sampleView("missing").asks;
  if (!docs || !tests) return [];
  return [
    { ask: docs, n: 1, before: { verdict: "missing", failure: docs.failure }, after: { verdict: "done", failure: null }, change: "fixed" },
    { ask: tests, n: 2, before: { verdict: "missing", failure: tests.failure }, after: { verdict: "missing", failure: tests.failure }, change: "still-missing" },
  ];
}

export const PATCH = `diff --git a/mkdocs.yml b/mkdocs.yml
new file mode 100644
--- /dev/null
+++ b/mkdocs.yml
@@ -0,0 +1,6 @@
+site_name: Grant SDK
+docs_dir: docs
+nav:
+  - Home: index.md
+  - Guides: guides.md
+theme: readthedocs
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -4,6 +4,7 @@
   "scripts": {
     "build": "tsc -p .",
-    "test": "vitest run"
+    "test": "vitest run",
+    "docs": "mkdocs build --strict"
   },
`;

export const SUMMARIES: MilestoneSummary[] = (
  [
    ["fix", { missing: 2, works: 0, unsure: 0 }, null],
    ["running", null, { current: 2, total: 3 }],
    ["error", null, null],
    ["no-checks", null, null],
    ["unsure", { missing: 0, works: 1, unsure: 1 }, null],
    ["ready", { missing: 0, works: 2, unsure: 0 }, null],
  ] as const
).map(([group, tally, runStep], i) => ({
  id: `00000000-0000-4000-8000-0000000d000${i}`,
  title: `${SAMPLE_MILESTONE.threadTitle ?? "Sample"} (${group})`,
  threadRepo: SAMPLE_MILESTONE.threadRepo,
  codeRepoUrl: SAMPLE_MILESTONE.codeRepoUrl,
  pinnedSha: SAMPLE_MILESTONE.pinnedSha,
  reviewer: SAMPLE_MILESTONE.reviewerLogin,
  askedAt: SAMPLE_MILESTONE.reviewerCommentAt?.toISOString() ?? null,
  group,
  tally: tally ? { ...tally } : null,
  runStep: runStep ? { ...runStep } : null,
  lastRunAt: group === "no-checks" ? null : NOW.toISOString(),
}));
