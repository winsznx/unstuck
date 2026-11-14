import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./db", () => ({
  db: () => {
    throw new Error("database down");
  },
}));
vi.mock("./fix-check", () => ({ startFixCheck: vi.fn() }));
vi.mock("./market-session", () => ({
  currentSession: vi.fn(),
  logMarket: vi.fn(),
  withMarket: vi.fn(),
}));

const session = await import("./market-session");
const { reconcileJobs } = await import("./market-jobs");

describe("reconcileJobs", () => {
  beforeEach(() => {
    vi.mocked(session.currentSession).mockReset();
    vi.mocked(session.logMarket).mockReset();
    vi.mocked(session.withMarket).mockReset();
  });

  it("does nothing for a signed-out viewer", async () => {
    vi.mocked(session.currentSession).mockResolvedValue(null);
    await reconcileJobs("m1");
    expect(session.withMarket).not.toHaveBeenCalled();
    expect(session.logMarket).not.toHaveBeenCalled();
  });

  it("logs and swallows a failure so the page still renders", async () => {
    vi.mocked(session.currentSession).mockResolvedValue({
      id: "s1",
      handle: "ada",
      nearAccountId: null,
      emailVerified: true,
      accessTokenEnc: "x",
      refreshTokenEnc: null,
      accessExpiresAt: null,
      scopes: [],
      createdAt: new Date(),
    });
    await expect(reconcileJobs("m1")).resolves.toBeUndefined();
    expect(session.logMarket).toHaveBeenCalledWith("reconcile failed", expect.any(Error));
  });

  it("logs a session read failure too", async () => {
    vi.mocked(session.currentSession).mockRejectedValue(new Error("cookies unavailable"));
    await expect(reconcileJobs("m1")).resolves.toBeUndefined();
    expect(session.logMarket).toHaveBeenCalled();
  });
});
