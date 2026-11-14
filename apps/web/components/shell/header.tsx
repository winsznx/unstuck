import Link from "next/link";
import type { MarketAccount } from "./account";
import { AccountChip } from "./account-chip";
import { MobileMenu } from "./menu";
import { START } from "./nav";
import { NavLinks } from "./nav-links";
import { Palette, PaletteButton } from "./palette";
import { SkipLink } from "./skip-link";
import { ThemeToggle } from "./theme-control";

/**
 * The tag mark and the wordmark. `compact` drops the wordmark under 416 px, where the header's Check a review and the
 * menu button naming your place need its room; the mark stays the home link and the label keeps the name.
 */
export function Logo({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" aria-label="UNSTUCK home" className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 text-h3 font-bold tracking-tight ${className}`}>
      <svg aria-hidden viewBox="0 0 32 32" className="size-7">
        <path d="M9 4h19a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H9L2 21V11z" className="fill-open stroke-on-open" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="9.5" cy="16" r="2.6" className="fill-on-open" />
      </svg>
      <span className={compact ? "max-[26rem]:hidden" : undefined}>UNSTUCK</span>
    </Link>
  );
}

/**
 * The bar on every page. Left to right: the wordmark, the places (the current one wears the graphite punch tag),
 * Jump, the Agent Market account, the theme, and Check a review. On a phone: the wordmark, Check a review, and a
 * menu button that names where you are. `account` undefined hides the account, for frames that can't read it, such as
 * the error page.
 */
export function HeaderBar({ account }: { account: MarketAccount | undefined }) {
  return (
    <>
      <SkipLink />
      <header className="sticky top-0 z-40 border-b border-border bg-canvas">
        <div className="mx-auto flex min-h-(--header-height) max-w-(--container-content) items-center gap-2 px-4 sm:px-6 lg:gap-3">
          <Logo compact className="mr-1 lg:mr-3" />
          <NavLinks />
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <span className="hidden lg:block">
              <PaletteButton />
            </span>
            {account && (
              <span className="hidden lg:block">
                <AccountChip account={account} />
              </span>
            )}
            <span className="hidden sm:block">
              <ThemeToggle />
            </span>
            <Link
              href={START.href}
              className="inline-flex min-h-11 shrink-0 items-center rounded-control bg-action px-3.5 text-small font-semibold whitespace-nowrap text-on-action transition-colors duration-(--duration-fast) hover:bg-action-strong sm:px-4"
            >
              {START.label}
            </Link>
            <MobileMenu account={account} />
          </div>
        </div>
      </header>
      <Palette />
    </>
  );
}
