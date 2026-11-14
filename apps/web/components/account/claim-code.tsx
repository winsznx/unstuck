"use client";

import { useEffect, useState } from "react";
import { clockOf, groupCode, secondsLeft } from "@/lib/account";
import { CopyButton } from "@/components/run/copy-button";

/**
 * The device code, printed on a claim ticket: the same clipped corner and punched hole as the punch
 * tag, with a perforation between the stub and the code. Yellow while it waits on the owner.
 */
export function ClaimCode({
  userCode,
  verificationUri,
  verificationUriComplete = null,
  expiresAt,
  lifetimeSeconds = 900,
  now: fixedNow,
}: {
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string | null;
  expiresAt: Date;
  /** How long the code lived when issued, for the bar under the clock. */
  lifetimeSeconds?: number;
  /** Freeze the clock (previews and screenshots). */
  now?: Date;
}) {
  const now = useNow(fixedNow);
  const left = now ? secondsLeft(expiresAt, now) : null;
  const groups = groupCode(userCode);
  const expired = left === 0;
  const share = left === null ? 1 : Math.min(1, left / lifetimeSeconds);
  const host = verificationUri.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div>
      <div
        className={`relative flex min-w-0 overflow-hidden rounded-sheet border ${expired ? "border-dashed border-border-strong bg-unsure-soft text-ink-secondary" : "border-open-edge bg-open text-ink"} shadow-tag`}
      >
        <div className="relative flex w-16 shrink-0 flex-col items-center justify-between border-r-2 border-dashed border-current/35 py-4 sm:w-24">
          <span aria-hidden className="size-3.5 rounded-full bg-surface shadow-[inset_0_1px_2px_color-mix(in_srgb,var(--color-shadow)_35%,transparent)]" />
          <span className="text-tag font-semibold tracking-wide [writing-mode:vertical-rl] rotate-180">Sign-in code</span>
          <span aria-hidden className="text-tag font-semibold opacity-70">1/1</span>
        </div>
        <span aria-hidden className="absolute top-0 left-16 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface sm:left-24" />
        <span aria-hidden className="absolute bottom-0 left-16 size-4 -translate-x-1/2 translate-y-1/2 rounded-full bg-surface sm:left-24" />
        <div className="min-w-0 flex-1 px-4 py-5 sm:px-8 sm:py-7">
          <p className="text-small font-semibold">Type this at {host}</p>
          <p
            className={`mt-2 flex flex-wrap items-baseline gap-x-3 font-mono text-[clamp(1.75rem,1.2rem+2.6vw,3rem)] leading-none font-semibold tracking-[0.08em] ${expired ? "line-through decoration-2" : ""}`}
            aria-label={`Code ${groups.join(" ").split("").join(" ")}`}
          >
            {groups.map((g, i) => (
              <span key={g} className="inline-flex items-baseline gap-3">
                {i > 0 && <span aria-hidden className="opacity-45">-</span>}
                {g}
              </span>
            ))}
          </p>
          <div className="mt-5 flex items-center gap-3 text-small">
            <span role="timer" aria-live="off">
              {left === null ? "Expires in 15 minutes" : expired ? "This code expired" : `Expires in ${clockOf(left)}`}
            </span>
            <span aria-hidden className="h-1 min-w-12 flex-1 overflow-hidden rounded-full bg-current/15">
              <span className="block h-full rounded-full bg-current/70 transition-[width] duration-1000 ease-linear" style={{ width: `${share * 100}%` }} />
            </span>
          </div>
        </div>
      </div>
      {!expired && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href={verificationUriComplete ?? verificationUri}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-action px-5 font-semibold text-on-action transition-colors duration-(--duration-fast) hover:bg-action-strong"
          >
            Open {host}
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <CopyButton value={groups.join("-")} label="Copy the sign-in code" />
        </div>
      )}
    </div>
  );
}

/** A clock for the countdown. null on the server and the first client render, so nothing mismatches. */
function useNow(fixed: Date | undefined): Date | null {
  const [now, setNow] = useState<Date | null>(fixed ?? null);
  useEffect(() => {
    if (fixed) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fixed]);
  return fixed ?? now;
}
