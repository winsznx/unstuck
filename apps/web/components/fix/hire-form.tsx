"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { HireResult } from "@/app/m/actions";
import { centsLabel } from "@/lib/fix-shared";
import { Button } from "../button";

export interface HireFormProps {
  action: (prev: HireResult, form: FormData) => Promise<HireResult>;
  milestoneId: string;
  agentId: string;
  agentName: string;
  priceCents: number | null;
  disabled?: boolean;
}

/** The one button that spends money. It always names the agent and the price it will hire at. */
export function HireForm({ action, milestoneId, agentId, agentName, priceCents, disabled = false }: HireFormProps) {
  const [result, submit, pending] = useActionState(action, { kind: "idle" });
  return (
    <form action={submit} className="space-y-3">
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <input type="hidden" name="agentId" value={agentId} />
      <input type="hidden" name="agentName" value={agentName} />
      {priceCents !== null && <input type="hidden" name="priceCents" value={priceCents} />}
      <Button type="submit" size="lg" className="w-full" disabled={disabled || pending || priceCents === null}>
        {pending ? "Checking your account…" : priceCents === null ? "No listed price" : `Hire ${agentName} for ${centsLabel(priceCents)}`}
      </Button>
      <div aria-live="polite">
        {result.kind === "checkout" && (
          <div className="space-y-3 rounded-panel border border-border bg-surface-muted px-4 py-3 text-small text-ink">
            <p>
              <span className="font-semibold">{result.agentName} is ready at {centsLabel(result.priceCents)}.</span>{" "}
              <span className="text-ink-secondary">You confirm and pay on Agent Market. Nothing is charged until you do, and this page follows the job after.</span>
            </p>
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-action px-5 font-semibold text-on-action transition-colors duration-(--duration-fast) hover:bg-action-strong"
            >
              Pay on Agent Market, {centsLabel(result.priceCents)}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        )}
        {result.kind === "needs-connect" && (
          <div className="rounded-panel border-2 border-dashed border-border-strong bg-unsure-soft px-4 py-3 text-small text-ink">
            <p className="font-semibold">{result.title}</p>
            <p className="mt-1 text-ink-secondary">
              {result.message}{" "}
              <Link className="font-medium text-ink underline underline-offset-4" href="/connect">
                Connect Agent Market
              </Link>
            </p>
          </div>
        )}
        {(result.kind === "verify-email" || result.kind === "hiring-off" || result.kind === "refused") && (
          <div className="rounded-panel border-2 border-dashed border-border-strong bg-unsure-soft px-4 py-3 text-small text-ink">
            <p className="font-semibold">{result.kind === "verify-email" ? "Confirm your email on Agent Market" : result.kind === "hiring-off" ? "Agent Market isn't taking hires" : "Nothing was hired"}</p>
            <p className="mt-1 text-ink-secondary">{result.message}</p>
          </div>
        )}
        {result.kind === "invalid" && <p className="text-small font-medium text-fails-text">{result.message}</p>}
      </div>
    </form>
  );
}
