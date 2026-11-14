"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { MarketAccount } from "./account";
import { AccountChip } from "./account-chip";
import { PLACES, placeFor, START } from "./nav";
import { ThemeChoice } from "./theme-control";

/**
 * The phone menu: every place with what you'll find there, the Agent Market account and the theme. The button
 * names the place you're in, so the bar still says where you are. A native modal dialog traps focus and closes on
 * Escape; it also closes when the route changes or a link in it is followed, since a link to a section of the same
 * page keeps the route.
 */
export function MobileMenu({ account }: { account: MarketAccount | undefined }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname() ?? "/";
  const current = placeFor(pathname);

  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-small font-semibold lg:hidden"
      >
        <span className="truncate">{current && current !== START ? current.label : "Menu"}</span>
        <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        aria-label="Menu"
        className="sheet fixed inset-0 h-dvh w-full"
        onClick={({ target }) => {
          if (target === dialog.current || (target instanceof Element && target.closest("a"))) dialog.current?.close();
        }}
      >
        <div className="sheet-panel ml-auto flex h-full w-[min(24rem,100%)] flex-col overflow-y-auto bg-canvas shadow-overlay">
          <div className="flex min-h-(--header-height) items-center justify-between gap-3 border-b border-border px-4">
            <p className="text-small font-semibold text-ink-secondary">Menu</p>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="grid size-10 place-items-center rounded-control text-ink-secondary hover:bg-surface-muted hover:text-ink"
              aria-label="Close menu"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <path d="m3.5 3.5 9 9M12.5 3.5l-9 9" />
              </svg>
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-6 px-4 py-5">
            <Link
              href={START.href}
              className="flex min-h-13 items-center justify-center rounded-control bg-action px-5 text-body font-semibold text-on-action hover:bg-action-strong"
            >
              {START.label}
            </Link>
            <button
              type="button"
              onClick={() => {
                dialog.current?.close();
                window.dispatchEvent(new Event("unstuck:jump"));
              }}
              className="-mt-3 flex min-h-12 items-center gap-3 rounded-control border border-border bg-surface px-4 text-left text-small text-ink-secondary hover:border-border-strong"
            >
              <svg aria-hidden viewBox="0 0 20 20" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="m13 13 4.5 4.5" />
              </svg>
              Paste a reviewer&apos;s link or a milestone id
            </button>
            <nav aria-label="Main">
              <ul className="divide-y divide-border overflow-hidden rounded-sheet border border-border bg-surface">
                {PLACES.map((place) => {
                  const here = current?.href === place.href;
                  return (
                    <li key={place.href}>
                      <Link href={place.href} aria-current={here ? "page" : undefined} className="flex items-start gap-3 px-4 py-3.5 hover:bg-surface-muted">
                        <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${here ? "bg-ink" : "border border-border-strong"}`} />
                        <span className="min-w-0">
                          <span className="block text-body font-semibold">{place.label}</span>
                          <span className="block text-small text-ink-secondary">{place.hint}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            {account && (
              <section aria-label="Agent Market account" className="rounded-sheet border border-border bg-surface p-4">
                <p className="text-small font-semibold">NEAR Agent Market</p>
                <p className="mt-1 text-small text-ink-secondary">
                  {account.state === "signed-out"
                    ? "Needed only once hiring ships. You'll sign in with a short code at market.near.ai. Not switched on yet."
                    : "Fixes you hire are paid from this balance, up to the limit you set."}
                </p>
                <div className="mt-3">
                  <AccountChip account={account} full />
                </div>
              </section>
            )}
            <ThemeChoice />
          </div>
        </div>
      </dialog>
    </>
  );
}
