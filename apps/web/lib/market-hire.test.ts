import { describe, expect, it, vi } from "vitest";
import type { Mandate } from "@unstuck/core";
import { MarketHiringOff, MarketRefusal, MarketUnauthorized, type PreparedJob } from "@unstuck/integrations/agent-market";
import { DELIVERY, hire, hireBrief, type HireDeps, type HireRequest, type NewJob } from "./market-hire";
import type { StoredSession } from "./market-auth";
import type { AskView, MilestoneView } from "./queries";

const NOW = new Date("2026-11-15T12:00:00Z");
const REPO = "https://github.com/o/r";
const SHA = "abcdef1234567890";

const SESSION: StoredSession = {
  id: "s1",
  handle: "ada",
  nearAccountId: "ada.near",
  emailVerified: true,
  accessTokenEnc: "sealed",
  refreshTokenEnc: null,
  accessExpiresAt: null,
  scopes: [],
  createdAt: NOW,
};

const ask = (id: string, verdict: AskView["verdict"]): AskView =>
  ({ id, quote: `quote ${id}`, severity: "blocks_payment", verdict, failure: verdict === "missing" ? { step: 1, name: "tests", line: "boom", exitCode: 1, timedOut: false } : null }) as AskView;

const VIEW = {
  milestone: { id: "m1", codeRepoUrl: REPO, pinnedSha: SHA, reviewerLogin: "rev", threadRepo: "near/grants", threadUrl: "https://github.com/near/grants/issues/1", reviewerCommentUrl: null, reviewerCommentAt: null },
  asks: [ask("ask-1", "done"), ask("ask-2", "missing")],
  base: { replay: { id: "run-1", status: "finished", steps: [{ command: "npm test" }] }, results: [] },
  patches: [],
} as unknown as MilestoneView;

const MANDATE: Mandate = { id: "md1", perJobCapCents: 2500, totalCapCents: 10_000, spentCents: 0, expiresAt: new Date("2026-12-15T00:00:00Z"), revokedAt: null };
const DRAFT: PreparedJob = { kind: "draft", draftId: "d1", checkoutUrl: "https://market.near.ai/checkout/d1", quotedPrice: "12.00", priceToken: "USD", replayed: false };
const REQUEST: HireRequest = { milestoneId: "m1", agentId: "agent-1", agentName: "Docs Mason", priceCents: 1200 };

function deps(over: Partial<HireDeps> = {}, prepare: () => Promise<PreparedJob> = async () => DRAFT) {
  const saved: NewJob[] = [];
  const prepareJob = vi.fn(prepare);
  const d: HireDeps = {
    now: () => NOW,
    newId: () => "req-1",
    siteUrl: "https://unstuck.test",
    session: async () => SESSION,
    view: async () => VIEW,
    openJob: async () => null,
    listedPrice: async () => 1200,
    mandate: async () => MANDATE,
    market: (_session, work) => work({ prepareJob }),
    saveJob: async (job) => void saved.push(job),
    log: vi.fn(),
    ...over,
  };
  return { d, saved, prepareJob };
}

describe("hire", () => {
  it("prepares the job, stores it as sent and answers the checkout", async () => {
    const { d, saved, prepareJob } = deps();
    expect(await hire(d, REQUEST)).toEqual({ kind: "checkout", url: DRAFT.kind === "draft" ? DRAFT.checkoutUrl : "", priceCents: 1200, agentName: "Docs Mason" });
    const brief = hireBrief(VIEW, "https://unstuck.test")!;
    expect(prepareJob).toHaveBeenCalledWith({ worker_agent_id: "agent-1", title: brief.title, description: brief.brief, client_request_id: "req-1" });
    expect(saved).toEqual([
      {
        milestoneId: "m1",
        askId: "ask-2",
        clientRequestId: "req-1",
        agentId: "agent-1",
        agentName: "Docs Mason",
        priceCents: 1200,
        mandateId: "md1",
        approvalUrl: "https://market.near.ai/checkout/d1",
        title: brief.title,
        brief: brief.brief,
      },
    ]);
  });

  it("writes the brief from the check report plus the delivery terms", () => {
    const brief = hireBrief(VIEW, "https://unstuck.test")!;
    expect(brief.title).toBe("Make a failing review check pass in o/r");
    expect(brief.brief).toContain('"quote ask-2"');
    expect(brief.brief).toContain(DELIVERY(REPO, SHA));
    expect(brief.brief).toContain("https://unstuck.test/runs/run-1");
  });

  it("needs a session", async () => {
    const { d, prepareJob } = deps({ session: async () => null });
    expect(await hire(d, REQUEST)).toMatchObject({ kind: "needs-connect", title: "Sign in with Agent Market first" });
    expect(prepareJob).not.toHaveBeenCalled();
  });

  it("needs a limit", async () => {
    const { d } = deps({ mandate: async () => null });
    expect(await hire(d, REQUEST)).toMatchObject({ kind: "needs-connect", title: "Set a spending limit first" });
  });

  it.each([
    ["over the per-hire cap", { perJobCapCents: 1000 }, "per-hire limit"],
    ["over what's left of the total", { spentCents: 9500 }, "past what's left"],
    ["expired", { expiresAt: new Date("2026-11-01T00:00:00Z") }, "expired"],
  ])("refuses a price %s and links to /connect", async (_name, over, text) => {
    const { d, prepareJob } = deps({ mandate: async () => ({ ...MANDATE, ...over }) });
    const result = await hire(d, REQUEST);
    expect(result.kind).toBe("needs-connect");
    expect(result.kind === "needs-connect" && result.message).toContain(text);
    expect(prepareJob).not.toHaveBeenCalled();
  });

  it("refuses when the listed price moved since the page loaded", async () => {
    const { d } = deps({ listedPrice: async () => 1500 });
    expect(await hire(d, REQUEST)).toMatchObject({ kind: "invalid", message: expect.stringContaining("$15") });
  });

  it("refuses an agent with no listed price", async () => {
    const { d } = deps({ listedPrice: async () => null });
    expect(await hire(d, REQUEST)).toMatchObject({ kind: "invalid" });
  });

  it("answers the open checkout again instead of preparing a second job", async () => {
    const { d, prepareJob } = deps({ openJob: async () => ({ status: "sent", approvalUrl: "https://market.near.ai/checkout/old", priceCents: 900, agentName: "Patchwork", agentId: "a0" }) });
    expect(await hire(d, REQUEST)).toEqual({ kind: "checkout", url: "https://market.near.ai/checkout/old", priceCents: 900, agentName: "Patchwork" });
    expect(prepareJob).not.toHaveBeenCalled();
  });

  it("won't hire twice once a job is under way", async () => {
    const { d } = deps({ openJob: async () => ({ status: "working", approvalUrl: null, priceCents: 900, agentName: null, agentId: "a0" }) });
    expect(await hire(d, REQUEST)).toMatchObject({ kind: "invalid" });
  });

  it("refuses a milestone with nothing failing", async () => {
    const { d } = deps({ view: async () => ({ ...VIEW, asks: [ask("ask-1", "done")] }) });
    expect(await hire(d, REQUEST)).toMatchObject({ kind: "invalid" });
  });

  it("asks the owner to confirm their email on -32003", async () => {
    const { d, saved } = deps({}, async () => {
      throw new MarketRefusal("MARKET_PREPARE_JOB", -32003, "verify", "email_verification_required", { code: "email_verification_required" });
    });
    expect(await hire(d, REQUEST)).toMatchObject({ kind: "verify-email" });
    expect(saved).toEqual([]);
  });

  it("says hiring is off when the market has no PREPARE_JOB", async () => {
    const { d } = deps({}, async () => {
      throw new MarketHiringOff();
    });
    expect(await hire(d, REQUEST)).toMatchObject({ kind: "hiring-off" });
  });

  it("passes any other refusal on", async () => {
    const { d } = deps({}, async () => {
      throw new MarketRefusal("MARKET_PREPARE_JOB", -32005, "The agent is paused.", null, null);
    });
    expect(await hire(d, REQUEST)).toMatchObject({ kind: "refused", message: expect.stringContaining("The agent is paused.") });
  });

  it("asks for a new sign-in when the token is refused", async () => {
    const { d } = deps({}, async () => {
      throw new MarketUnauthorized();
    });
    expect(await hire(d, REQUEST)).toMatchObject({ kind: "needs-connect", title: "Sign in with Agent Market again" });
  });

  it("logs and refuses when the market doesn't answer", async () => {
    const { d } = deps({}, async () => {
      throw new Error("socket hang up");
    });
    expect(await hire(d, REQUEST)).toMatchObject({ kind: "refused" });
    expect(d.log).toHaveBeenCalled();
  });

  it("won't send the owner to pay a quote above the listed price", async () => {
    const { d, saved } = deps({}, async () => ({ ...DRAFT, quotedPrice: "13.00" }) as PreparedJob);
    expect(await hire(d, REQUEST)).toMatchObject({ kind: "refused", message: expect.stringContaining("$13") });
    expect(saved).toEqual([]);
  });

  it("refuses an answer that's already a paid job", async () => {
    const { d, saved } = deps({}, async () => ({ kind: "funded", jobId: "j1", jobUrl: null, assignmentId: null }));
    expect(await hire(d, REQUEST)).toMatchObject({ kind: "refused" });
    expect(saved).toEqual([]);
  });
});
