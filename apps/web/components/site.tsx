import Link from "next/link";
import { readMarketAccount, type MarketAccount } from "./shell/account";
import { HeaderBar, Logo } from "./shell/header";
import { START } from "./shell/nav";

export { Logo };

/** The header every page renders. Reads the Agent Market account unless the page passes one. */
export async function SiteHeader({ account }: { account?: MarketAccount } = {}) {
  return <HeaderBar account={account ?? (await readMarketAccount())} />;
}

const FOOTER = [
  {
    title: "Grantees",
    links: [
      { href: START.href, label: START.label },
      { href: "/m", label: "Your milestones" },
      { href: "/#how", label: "How one milestone goes" },
      { href: "/docs", label: "Docs" },
      { href: "/docs/faq", label: "Questions" },
    ],
  },
  {
    title: "Proof",
    links: [
      { href: "/study", label: "Study of public reviews" },
      { href: "/#proof", label: "A recorded run" },
      { href: "/docs/limits", label: "What UNSTUCK won't do" },
      { href: "/llms.txt", label: "llms.txt" },
    ],
  },
  {
    title: "NEAR Agent Market",
    links: [
      { href: "/connect", label: "How sign-in will work" },
      { href: "/agents", label: "How your agent calls UNSTUCK" },
      { href: "https://market.near.ai", label: "market.near.ai" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-(--container-content) grid-cols-2 gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="col-span-2 max-w-sm md:col-span-1">
          <Logo />
          <p className="mt-4 text-small text-ink-secondary">Shows which open items in a milestone review fail on the commit the reviewer saw, with a rerun log behind every tag.</p>
        </div>
        {FOOTER.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-small font-semibold text-ink">{column.title}</h2>
            <ul className="mt-3 space-y-1">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link className="inline-flex min-h-11 items-center text-small text-ink-secondary hover:text-ink sm:min-h-9" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-(--container-content) flex-col gap-2 border-t border-border px-4 py-6 text-small text-ink-muted sm:flex-row sm:justify-between sm:px-6">
        <p>UNSTUCK can&apos;t make a funder pay. Your reviewer still decides.</p>
        <p>Not affiliated with Web3 Foundation or the Canton Foundation. Milestone and run links are permanent. Built at NEAR HACKATHON 2026.</p>
      </div>
    </footer>
  );
}
