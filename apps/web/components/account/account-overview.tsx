import type { ReactNode } from "react";
import { ButtonLink } from "@/components/button";
import { HIRING_SCOPE, MARKET_ORIGIN, money, type SignedInAccount } from "@/lib/account";
import { clock, day } from "@/lib/format";
import { AccessTerms } from "./access-terms";
import { HireList } from "./hire-list";
import { LimitMeter } from "./limit-meter";

/**
 * A signed-in owner's account: who they are on Agent Market, the balance, the limit and what's left
 * of it, and every hire. `actions` holds sign out and turn off, which need server actions.
 */
export function AccountOverview({ account, now, actions }: { account: SignedInAccount; now: Date; actions?: ReactNode }) {
  const { identity } = account;
  return (
    <div className="space-y-10">
      <section aria-labelledby="who" className="flex flex-col gap-5 rounded-sheet border border-border bg-surface px-4 py-5 shadow-object sm:flex-row sm:items-center sm:px-6">
        <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-ink text-h2 font-bold text-on-action">
          {identity.handle.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="who" className="text-h2 font-semibold wrap-anywhere">
            {identity.handle}
          </h2>
          <p className="mt-0.5 font-mono text-small wrap-anywhere text-ink-secondary">{identity.nearAccountId}</p>
          <p className="mt-1.5 text-small text-ink-muted">
            Signed in with NEAR Agent Market on {day(account.signedInAt)}. Access: <span className="font-mono">{account.scopes.join(", ") || HIRING_SCOPE}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-labelledby="limit" className="rounded-sheet border border-border bg-surface px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="limit" className="text-h2 font-semibold">
              Spending limit
            </h2>
            <ButtonLink href="/connect?step=limit" variant="secondary" className="min-h-10! px-4! text-small!">
              {account.limit ? "Change the limit" : "Set a limit"}
            </ButtonLink>
          </div>
          <div className="mt-5">
            {account.limit ? (
              <LimitMeter limit={account.limit} now={now} />
            ) : (
              <p className="rounded-panel border border-dashed border-border-strong px-4 py-5 text-ink-secondary">
                No limit set, so UNSTUCK can&apos;t hire anyone for you. Set one and it applies to every hire until it ends.
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="balance" className="rounded-sheet border border-border bg-surface px-4 py-5 sm:px-6 sm:py-6">
          <h2 id="balance" className="text-h2 font-semibold">
            Agent Market balance
          </h2>
          {account.balanceCents === null ? (
            <p className="mt-5 text-ink-secondary">The balance couldn&apos;t be read just now. Hiring checks it again before paying.</p>
          ) : (
            <p className="mt-5 text-display leading-none font-semibold">{money(account.balanceCents)}</p>
          )}
          <p className="mt-2 text-small text-ink-muted">Read {clock(account.balanceReadAt)}.</p>
          <p className="mt-4 text-small text-ink-secondary">
            UNSTUCK never adds money. Top up on{" "}
            <a href={MARKET_ORIGIN} target="_blank" rel="noreferrer" className="font-medium text-ink underline underline-offset-4">
              Agent Market
            </a>
            .
          </p>
          {account.limit && account.balanceCents !== null && account.balanceCents < account.limit.perHireCapCents && (
            <p className="mt-4 rounded-control bg-open-soft px-3 py-2.5 text-small text-ink">
              Your balance is below your per-hire most, so a hire at that price would fail. Top up, or hire a cheaper agent.
            </p>
          )}
        </section>
      </div>

      <section aria-labelledby="hires">
        <h2 id="hires" className="text-h2 font-semibold">
          Hires
        </h2>
        <p className="mt-1 text-small text-ink-secondary">Each one links to the milestone it was for, where its checks and pull request live.</p>
        <div className="mt-4">
          <HireList hires={account.hires} />
        </div>
      </section>

      <section aria-labelledby="terms">
        <h2 id="terms" className="text-h2 font-semibold">
          What the connection allows
        </h2>
        <AccessTerms className="mt-4" />
      </section>
    </div>
  );
}

/** The account page for a visitor who hasn't connected Agent Market. */
export function SignedOutAccount() {
  return (
    <div className="space-y-10">
      <section className="grid gap-8 rounded-sheet border border-border bg-surface px-4 py-6 shadow-object sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-center">
        <div>
          <h2 className="text-h1 font-semibold">You haven&apos;t connected Agent Market</h2>
          <p className="mt-2 max-w-(--container-reading) text-ink-secondary">
            You only need it to have a fix built. Rerunning your reviewer&apos;s checks, reading the run record and sharing it all work without an account.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ButtonLink href="/connect">Connect Agent Market</ButtonLink>
            <ButtonLink href="/start" variant="secondary">
              Start a milestone
            </ButtonLink>
          </div>
        </div>
        <ol className="space-y-3 border-t border-border pt-6 text-small lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          {["Sign in with a short code on market.near.ai", "Set a spending limit, per hire and in total", "Hire from a milestone when a check fails"].map((line, i) => (
            <li key={line} className="flex gap-3">
              <span aria-hidden className="grid size-5.5 shrink-0 place-items-center rounded-full border border-border-strong text-tag font-semibold">
                {i + 1}
              </span>
              <span className="text-ink-secondary">{line}</span>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="terms">
        <h2 id="terms" className="text-h2 font-semibold">
          What connecting allows
        </h2>
        <AccessTerms className="mt-4" />
      </section>
    </div>
  );
}
