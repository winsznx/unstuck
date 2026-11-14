import { describe, expect, it, vi } from "vitest";
import { MarketRefusal, type JobResult, type JobStatus as MarketJobStatus, type PreparedJob } from "@unstuck/integrations/agent-market";
import { findFixLink, reconcileWith, stageOf, type JobStore, type ReconcileDeps, type TrackedJob } from "./market-reconcile";

const AUTO = new Date("2026-11-18T12:00:00Z");

const job = (over: Partial<TrackedJob> = {}): TrackedJob => ({
  id: "job-1",
  clientRequestId: "req-1",
  marketJobId: null,
  agentId: "agent-1",
  priceCents: 1200,
  mandateId: "md1",
  status: "sent",
  title: "Make a failing review check pass in o/r",
  brief: "brief",
  autoAcceptAt: null,
  ...over,
});

const DRAFT: PreparedJob = { kind: "draft", draftId: "d1", checkoutUrl: "https://market.near.ai/checkout/d1", quotedPrice: "12.00", priceToken: "USD", replayed: true };
const FUNDED: PreparedJob = { kind: "funded", jobId: "mj-1", jobUrl: null, assignmentId: "as1" };
const status = (workerState: string, resultAvailable = false, autoAcceptAt: Date | null = null): MarketJobStatus => ({ workerState, resultAvailable, autoAcceptAt, expectedBy: null });

function setup(opts: { prepared?: PreparedJob; status?: MarketJobStatus | Error; results?: JobResult[]; claim?: boolean; check?: { ok: true; replayId: string } | { ok: false; error: string } }) {
  const results = [...(opts.results ?? [])];
  const store = {
    followed: vi.fn<JobStore["followed"]>(),
    markFunded: vi.fn<JobStore["markFunded"]>(async () => true),
    setStatus: vi.fn<JobStore["setStatus"]>(async () => undefined),
    claimDelivery: vi.fn<JobStore["claimDelivery"]>(async () => opts.claim ?? true),
    setFixReplay: vi.fn<JobStore["setFixReplay"]>(async () => undefined),
  };
  const market = {
    prepareJob: vi.fn(async () => opts.prepared ?? FUNDED),
    jobStatus: vi.fn(async () => {
      if (opts.status instanceof Error) throw opts.status;
      return opts.status ?? status("still working");
    }),
    jobResult: vi.fn(async (): Promise<JobResult> => results.shift() ?? { status: "unavailable", note: null }),
  };
  const startFixCheck = vi.fn(async () => opts.check ?? ({ ok: true, replayId: "replay-1" } as const));
  const deps: ReconcileDeps = { store, market, startFixCheck, log: vi.fn() };
  return { deps, store, market, startFixCheck };
}

describe("stageOf", () => {
  it.each([
    ["nobody hired yet", "accepted"],
    ["still working", "working"],
    ["delivered — awaiting your review", "delivered"],
    ["some delivered, some still working", "delivered"],
    ["finished", "delivered"],
    ["cancelled — no result", "refunded"],
    ["in dispute", "failed"],
    ["something new", null],
  ])("%s -> %s", (state, stage) => {
    expect(stageOf(state)).toBe(stage);
  });
});

describe("findFixLink", () => {
  it("finds the first pull request or commit link", () => {
    expect(findFixLink("Done. See https://github.com/o/r/pull/12 and https://github.com/o/r/commit/abc1234")).toBe("https://github.com/o/r/pull/12");
    expect(findFixLink("https://github.com/o/r/commit/abcdef1234567")).toBe("https://github.com/o/r/commit/abcdef1234567");
    expect(findFixLink("https://github.com/o/r and https://gitlab.com/o/r/pull/1")).toBeNull();
  });
});

describe("reconcileWith", () => {
  it("leaves an unpaid draft alone", async () => {
    const { deps, store, market } = setup({ prepared: DRAFT });
    await reconcileWith(deps, "m1", [job()]);
    expect(market.prepareJob).toHaveBeenCalledWith({ worker_agent_id: "agent-1", title: job().title, description: "brief", client_request_id: "req-1" });
    expect(market.jobStatus).not.toHaveBeenCalled();
    expect(store.markFunded).not.toHaveBeenCalled();
  });

  it("stores the job once it's paid, then follows it", async () => {
    const { deps, store, market } = setup({ status: status("still working", false, AUTO) });
    await reconcileWith(deps, "m1", [job()]);
    expect(store.markFunded).toHaveBeenCalledWith(job(), "mj-1");
    expect(market.jobStatus).toHaveBeenCalledWith("mj-1");
    expect(store.setStatus).toHaveBeenCalledWith("job-1", "working", AUTO);
  });

  it("doesn't replay PREPARE_JOB for a job it already knows", async () => {
    const { deps, market } = setup({ status: status("still working") });
    await reconcileWith(deps, "m1", [job({ marketJobId: "mj-1", status: "working" })]);
    expect(market.prepareJob).not.toHaveBeenCalled();
  });

  it("writes nothing when nothing changed", async () => {
    const { deps, store } = setup({ status: status("still working") });
    await reconcileWith(deps, "m1", [job({ marketJobId: "mj-1", status: "working" })]);
    expect(store.setStatus).not.toHaveBeenCalled();
  });

  it("maps a cancelled job to refunded", async () => {
    const { deps, store } = setup({ status: status("cancelled — no result") });
    await reconcileWith(deps, "m1", [job({ marketJobId: "mj-1", status: "accepted" })]);
    expect(store.setStatus).toHaveBeenCalledWith("job-1", "refunded", null);
  });

  it("maps a dispute to failed", async () => {
    const { deps, store } = setup({ status: status("in dispute") });
    await reconcileWith(deps, "m1", [job({ marketJobId: "mj-1", status: "working" })]);
    expect(store.setStatus).toHaveBeenCalledWith("job-1", "failed", null);
  });

  it("keeps a delivery working until its result can be read", async () => {
    const { deps, store } = setup({ status: status("delivered — awaiting your review", false) });
    await reconcileWith(deps, "m1", [job({ marketJobId: "mj-1", status: "accepted" })]);
    expect(store.setStatus).toHaveBeenCalledWith("job-1", "working", null);
    expect(store.claimDelivery).not.toHaveBeenCalled();
  });

  it("checks the delivered pull request once and stores the replay", async () => {
    const { deps, store, startFixCheck } = setup({
      status: status("delivered — awaiting your review", true, AUTO),
      results: [{ status: "delivered", contentChunk: "Fixed in https://github.com/o/r/pull/7", nextOffset: null }],
    });
    await reconcileWith(deps, "m1", [job({ marketJobId: "mj-1", status: "working" })]);
    expect(store.claimDelivery).toHaveBeenCalledWith("job-1", AUTO);
    expect(startFixCheck).toHaveBeenCalledWith("m1", "https://github.com/o/r/pull/7");
    expect(store.setFixReplay).toHaveBeenCalledWith("job-1", "replay-1");
  });

  it("reads an external deliverable link", async () => {
    const { deps, startFixCheck } = setup({
      status: status("delivered — awaiting your review", true),
      results: [{ status: "external", deliverableUrl: "https://github.com/o/r/commit/abc1234" }],
    });
    await reconcileWith(deps, "m1", [job({ marketJobId: "mj-1", status: "working" })]);
    expect(startFixCheck).toHaveBeenCalledWith("m1", "https://github.com/o/r/commit/abc1234");
  });

  it("pages through the result until the link turns up", async () => {
    const { deps, market, startFixCheck } = setup({
      status: status("finished", true),
      results: [
        { status: "delivered", contentChunk: "notes...", nextOffset: 100 },
        { status: "delivered", contentChunk: "https://github.com/o/r/pull/9", nextOffset: null },
      ],
    });
    await reconcileWith(deps, "m1", [job({ marketJobId: "mj-1", status: "working" })]);
    expect(market.jobResult).toHaveBeenLastCalledWith("mj-1", 100);
    expect(startFixCheck).toHaveBeenCalledWith("m1", "https://github.com/o/r/pull/9");
  });

  it("starts no second check when another request claimed the delivery", async () => {
    const { deps, startFixCheck } = setup({
      status: status("delivered — awaiting your review", true),
      results: [{ status: "external", deliverableUrl: "https://github.com/o/r/pull/7" }],
      claim: false,
    });
    await reconcileWith(deps, "m1", [job({ marketJobId: "mj-1", status: "working" })]);
    expect(startFixCheck).not.toHaveBeenCalled();
  });

  it("marks a delivery without a link delivered and logs it", async () => {
    const { deps, store, startFixCheck } = setup({
      status: status("delivered — awaiting your review", true),
      results: [{ status: "delivered", contentChunk: "Here's a zip.", nextOffset: null }],
    });
    await reconcileWith(deps, "m1", [job({ marketJobId: "mj-1", status: "working" })]);
    expect(store.claimDelivery).toHaveBeenCalled();
    expect(startFixCheck).not.toHaveBeenCalled();
    expect(deps.log).toHaveBeenCalled();
  });

  it("logs a fix check that didn't start and stores no replay", async () => {
    const { deps, store } = setup({
      status: status("delivered — awaiting your review", true),
      results: [{ status: "external", deliverableUrl: "https://github.com/x/y/pull/1" }],
      check: { ok: false, error: "That pull request goes into x/y" },
    });
    await reconcileWith(deps, "m1", [job({ marketJobId: "mj-1", status: "working" })]);
    expect(store.setFixReplay).not.toHaveBeenCalled();
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining("x/y"));
  });

  it("marks a deleted job refunded", async () => {
    const { deps, store } = setup({ status: new MarketRefusal("MARKET_GET_JOB_STATUS", -32001, "gone", "job_deleted", { code: "job_deleted" }) });
    await reconcileWith(deps, "m1", [job({ marketJobId: "mj-1", status: "working" })]);
    expect(store.setStatus).toHaveBeenCalledWith("job-1", "refunded", null);
  });

  it("logs any other error, never throws, and moves on to the next job", async () => {
    const { deps, market } = setup({ status: new Error("market down") });
    await expect(reconcileWith(deps, "m1", [job({ id: "a", marketJobId: "mj-1" }), job({ id: "b", marketJobId: "mj-2" })])).resolves.toBeUndefined();
    expect(market.jobStatus).toHaveBeenCalledTimes(2);
    expect(deps.log).toHaveBeenCalledTimes(2);
  });

  it("skips a job with no stored brief to replay", async () => {
    const { deps, market } = setup({});
    await reconcileWith(deps, "m1", [job({ title: null })]);
    expect(market.prepareJob).not.toHaveBeenCalled();
  });
});
