import { checkMandate, type Mandate } from "@unstuck/core";
import { MarketHiringOff, MarketRefusal, MarketUnauthorized, priceToCents, type MarketMcp } from "@unstuck/integrations/agent-market";
import { money } from "./account";
import { checkReport } from "./check-report";
import { repoName } from "./format";
import { REFUSAL_TEXT } from "./hire-rules";
import type { StoredSession } from "./market-auth";
import type { MilestoneView } from "./queries";

/**
 * Hiring an agent for a milestone. Nothing here moves money: MARKET_PREPARE_JOB saves a draft, and the owner pays
 * on Agent Market's checkout page. UNSTUCK only checks the price against the owner's limit before sending them there.
 */

export type HireResult =
  | { kind: "idle" }
  | { kind: "invalid"; message: string }
  /** Signed out, no limit, or the limit doesn't cover this price. The form links to /connect. */
  | { kind: "needs-connect"; title: string; message: string }
  | { kind: "verify-email"; message: string }
  | { kind: "hiring-off"; message: string }
  | { kind: "refused"; message: string }
  | { kind: "checkout"; url: string; priceCents: number; agentName: string };

export interface HireRequest {
  milestoneId: string;
  agentId: string;
  agentName: string;
  /** The price the page showed. Checked against the live listing so the owner never confirms a stale one. */
  priceCents: number | null;
}

export interface NewJob {
  milestoneId: string;
  askId: string;
  clientRequestId: string;
  agentId: string;
  agentName: string;
  priceCents: number;
  mandateId: string;
  approvalUrl: string;
  title: string;
  brief: string;
}

export interface OpenJob {
  status: string;
  approvalUrl: string | null;
  priceCents: number;
  agentName: string | null;
  agentId: string;
}

export interface HireDeps {
  now: () => Date;
  newId: () => string;
  siteUrl: string;
  session: () => Promise<StoredSession | null>;
  view: (milestoneId: string) => Promise<MilestoneView | null>;
  /** The newest job on the milestone that hasn't failed or been refunded. */
  openJob: (milestoneId: string) => Promise<OpenJob | null>;
  listedPrice: (agentId: string) => Promise<number | null>;
  mandate: (handle: string) => Promise<Mandate | null>;
  market: <T>(session: StoredSession, work: (market: Pick<MarketMcp, "prepareJob">) => Promise<T>) => Promise<T>;
  saveJob: (job: NewJob) => Promise<void>;
  log: (message: string, error?: unknown) => void;
}

export const DELIVERY = (repo: string, sha: string) =>
  `Work from ${repo} at commit ${sha}. Deliver a pull request against ${repo} (from a fork is fine), or a public commit link. UNSTUCK reruns the reviewer's checks on it; a fix is done when they exit 0.`;

export function hireBrief(view: MilestoneView, siteUrl: string): { title: string; brief: string } | null {
  const repo = view.milestone.codeRepoUrl;
  const sha = view.milestone.pinnedSha;
  if (!repo || !sha) return null;
  const report = checkReport(view, siteUrl);
  const missing = report.asks.filter((a) => a.verdict === "still_missing").length;
  const title = `Make ${missing === 1 ? "a failing review check" : `${missing} failing review checks`} pass in ${repoName(repo)}`;
  const lines = [report.brief, "", DELIVERY(repo, sha)];
  if (report.runRecord) lines.push("", `The run record with every check and its output: ${report.runRecord}`);
  return { title, brief: lines.join("\n") };
}

const connect = (title: string, message: string): HireResult => ({ kind: "needs-connect", title, message });

export async function hire(deps: HireDeps, request: HireRequest): Promise<HireResult> {
  const session = await deps.session();
  if (!session) return connect("Sign in with Agent Market first", "Hiring pays from your own Agent Market account, so UNSTUCK needs you signed in. Nothing was sent.");

  const view = await deps.view(request.milestoneId);
  if (!view) return { kind: "invalid", message: "This milestone doesn't exist." };
  if (view.base?.replay.status !== "finished") return { kind: "invalid", message: "Hiring needs a finished run, so the agent knows which checks fail." };
  const ask = view.asks.find((a) => a.verdict === "missing");
  if (!ask) return { kind: "invalid", message: "Nothing is failing on the reviewed commit, so there's nothing to hire for." };
  const brief = hireBrief(view, deps.siteUrl);
  if (!brief) return { kind: "invalid", message: "This milestone has no repo and commit to hand an agent." };

  const open = await deps.openJob(request.milestoneId);
  if (open?.status === "sent" && open.approvalUrl) {
    return { kind: "checkout", url: open.approvalUrl, priceCents: open.priceCents, agentName: open.agentName ?? open.agentId };
  }
  if (open) return { kind: "invalid", message: "An agent is already hired for this milestone. Follow it on this page." };

  const price = await deps.listedPrice(request.agentId);
  if (price === null) return { kind: "invalid", message: "This agent has no listed price right now, so it can't be hired." };
  if (request.priceCents !== null && request.priceCents !== price) {
    return { kind: "invalid", message: `${request.agentName}'s price changed to ${money(price)}. Reload the page to see it before you hire.` };
  }

  const mandate = await deps.mandate(session.handle);
  if (!mandate) return connect("Set a spending limit first", "UNSTUCK only sends you to pay inside a limit you set. It takes a minute and costs nothing.");
  const decision = checkMandate(mandate, price, deps.now());
  if (!decision.ok) return connect("Your spending limit doesn't cover this hire", REFUSAL_TEXT[decision.reason]);

  const clientRequestId = deps.newId();
  let prepared;
  try {
    prepared = await deps.market(session, (market) =>
      market.prepareJob({ worker_agent_id: request.agentId, title: brief.title, description: brief.brief, client_request_id: clientRequestId }),
    );
  } catch (error) {
    return refusalResult(deps, error);
  }
  if (prepared.kind !== "draft") {
    deps.log("hire: a fresh request id answered as an already paid job");
    return { kind: "refused", message: "Agent Market answered in a way UNSTUCK didn't expect. Nothing was charged. Check your jobs on market.near.ai." };
  }

  let quoted: number;
  try {
    quoted = priceToCents(prepared.quotedPrice);
  } catch (error) {
    deps.log("hire: unreadable quoted price", error);
    return { kind: "refused", message: "Agent Market's quote couldn't be read, so UNSTUCK won't send you to pay it. Nothing was charged." };
  }
  if (quoted > price) {
    return { kind: "refused", message: `Agent Market quoted ${money(quoted)}, above the listed ${money(price)}. Nothing was charged.` };
  }

  await deps.saveJob({
    milestoneId: request.milestoneId,
    askId: ask.id,
    clientRequestId,
    agentId: request.agentId,
    agentName: request.agentName,
    priceCents: quoted,
    mandateId: mandate.id,
    approvalUrl: prepared.checkoutUrl,
    title: brief.title,
    brief: brief.brief,
  });
  return { kind: "checkout", url: prepared.checkoutUrl, priceCents: quoted, agentName: request.agentName };
}

function refusalResult(deps: Pick<HireDeps, "log">, error: unknown): HireResult {
  if (error instanceof MarketHiringOff) {
    return { kind: "hiring-off", message: "Agent Market has hiring switched off right now. Nothing was sent and nothing was spent. Try again later." };
  }
  if (error instanceof MarketUnauthorized) return connect("Sign in with Agent Market again", "Your sign-in ended on Agent Market. Nothing was sent.");
  if (error instanceof MarketRefusal) {
    if (error.reason === "email_verification_required") {
      return { kind: "verify-email", message: "Agent Market won't take a hire until you confirm your email. Open the link it emailed you at signup, or send a new one from the banner on market.near.ai, then hire again." };
    }
    return { kind: "refused", message: `Agent Market refused the hire: ${error.message} Nothing was charged.` };
  }
  deps.log("hire: prepare job failed", error);
  return { kind: "refused", message: "Agent Market didn't answer. Nothing was sent and nothing was charged. Try again in a minute." };
}
