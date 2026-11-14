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
        {result.kind === "not-switched-on" && (
          <div className="rounded-panel border-2 border-dashed border-border-strong bg-unsure-soft px-4 py-3 text-small text-ink">
            <p className="font-semibold">Hiring isn&apos;t switched on in this build.</p>
            <p className="mt-1 text-ink-secondary">
              Nothing was sent to {result.agentName} and nothing was spent. When it&apos;s on, this button first asks you to{" "}
              <Link className="font-medium text-ink underline underline-offset-4" href="/connect">
                connect Agent Market
              </Link>{" "}
              and set a spending limit.
            </p>
          </div>
        )}
        {result.kind === "invalid" && <p className="text-small font-medium text-fails-text">{result.message}</p>}
      </div>
    </form>
  );
}
