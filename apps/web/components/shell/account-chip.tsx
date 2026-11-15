import Link from "next/link";
import { money } from "./money";
import type { MarketAccount } from "./account";

/**
 * The Agent Market account in the header. Signed out it's a dashed tag, an item not yet done, and it points to
 * /connect, where the owner signs in to hire. Signed in it shows the handle and the balance hires come out of.
 */
export function AccountChip({ account, full = false }: { account: MarketAccount; full?: boolean }) {
  if (account.state === "signed-out") {
    return (
      <Link
        href="/connect"
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control border border-dashed border-border-strong px-3 text-small font-medium whitespace-nowrap text-ink-secondary transition-colors duration-(--duration-fast) hover:border-ink-muted hover:text-ink"
      >
        <MarketGlyph />
        <span>
          <span className={full ? "" : "max-xl:sr-only"}>NEAR </span>Agent Market
        </span>
        <span className="border-l border-border-strong pl-2 font-normal text-ink-muted">Connect</span>
      </Link>
    );
  }
  return (
    <Link
      href="/account"
      className="inline-flex min-h-11 min-w-0 shrink items-center gap-2 rounded-control border border-border bg-surface px-3 text-small transition-colors duration-(--duration-fast) hover:border-border-strong"
    >
      <MarketGlyph />
      <span className="truncate font-semibold">{account.handle}</span>
      {account.balanceCents !== null && <span className="shrink-0 text-ink-secondary">{money(account.balanceCents)}</span>}
    </Link>
  );
}

function MarketGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M2.5 6.2 3.6 2.5h8.8l1.1 3.7M2.5 6.2h11M2.5 6.2v7.3h11V6.2M6.2 13.5V9.6h3.6v3.9" />
    </svg>
  );
}
