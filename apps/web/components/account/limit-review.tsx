import type { ReactNode } from "react";
import { HIRING_SCOPE, money, type MarketIdentity } from "@/lib/account";
import { day } from "@/lib/format";

export interface LimitTerms {
  perHireCapCents: number;
  totalCapCents: number;
  expiresAt: Date;
  hiresCovered: number;
}

/**
 * The limit as the owner signs off on it: a work order with its not-to-exceed lines, who it's for,
 * and the plain rules UNSTUCK follows under it. `actions` holds the confirm and change buttons.
 */
export function LimitReview({
  terms,
  identity,
  actions,
  status,
}: {
  terms: LimitTerms;
  /** null before sign-in; the sheet says the account is still missing. */
  identity: MarketIdentity | null;
  actions?: ReactNode;
  status?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-sheet border border-border-strong bg-surface shadow-object">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border bg-surface-muted px-4 py-3.5 sm:px-6">
        <p className="font-semibold">Spending limit for hiring on NEAR Agent Market</p>
        <p className="text-small text-ink-muted">Not set until you confirm</p>
      </div>

      <dl className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Term label="One hire, at most" value={money(terms.perHireCapCents)} />
        <Term label="All hires, at most" value={money(terms.totalCapCents)} note={terms.hiresCovered === 1 ? "One hire" : `Up to ${terms.hiresCovered} hires`} />
        <Term label="Ends" value={day(terms.expiresAt)} note="Or sooner, if you turn it off" />
      </dl>

      <div className="grid gap-6 border-t border-border px-4 py-5 sm:grid-cols-2 sm:px-6">
        <div>
          <p className="font-semibold">Paid from</p>
          {identity ? (
            <p className="mt-1 text-ink-secondary">
              {identity.handle}, <span className="font-mono text-small text-ink">{identity.nearAccountId}</span>
            </p>
          ) : (
            <p className="mt-1 text-ink-secondary">Your Agent Market account, once you sign in.</p>
          )}
          <p className="mt-1 text-small text-ink-muted">
            Through <span className="font-mono">{HIRING_SCOPE}</span> access, approved on Agent Market.
          </p>
        </div>
        <div>
          <p className="font-semibold">Under this limit, UNSTUCK</p>
          <ul className="mt-1.5 space-y-1 text-ink-secondary">
            <li>pays only the agent&apos;s own listed price, shown before each hire</li>
            <li>stops at either cap, and never tops up your balance</li>
            <li>can&apos;t move money anywhere except to the hired agent</li>
          </ul>
        </div>
      </div>

      {(status || actions) && (
        <div className="space-y-4 border-t border-border px-4 py-4 sm:px-6">
          {status}
          {actions && <div className="flex flex-wrap items-center justify-end gap-3">{actions}</div>}
        </div>
      )}
    </div>
  );
}

function Term({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-5">
      <dt className="text-small text-ink-muted">{label}</dt>
      <dd className="mt-1 text-h1 font-semibold">{value}</dd>
      {note && <dd className="mt-0.5 text-small text-ink-secondary">{note}</dd>}
    </div>
  );
}
