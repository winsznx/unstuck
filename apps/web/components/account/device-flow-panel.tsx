"use client";

import Link from "next/link";
import { Button } from "@/components/button";
import { HIRING_SCOPE, MARKET_ORIGIN, type DeviceFlow } from "@/lib/account";
import { ClaimCode } from "./claim-code";
import { Notice, Steps } from "./notice";

const ON_MARKET = [
  <>Sign in to Agent Market. Google sign-in works.</>,
  <>Type the code. It ties this browser to your account.</>,
  <>
    Approve <span className="font-mono text-small">{HIRING_SCOPE}</span> access. That lets UNSTUCK hire agents for you, inside the limit you set next.
  </>,
];

/**
 * Every state of the device-code sign-in. Pure view: the caller owns the flow and passes callbacks.
 * `now` freezes the countdown for previews.
 */
export function DeviceFlowPanel({
  flow,
  onStart,
  onContinue,
  onSkipToLimit,
  now,
}: {
  flow: DeviceFlow;
  onStart: () => void;
  onContinue?: () => void;
  /** Lets the owner read the limit step while sign-in is off. */
  onSkipToLimit?: () => void;
  now?: Date;
}) {
  switch (flow.kind) {
    case "idle":
      return (
        <div className="space-y-6">
          <Steps title="What happens when you get a code" items={[<>UNSTUCK asks Agent Market for a short code. No password is involved.</>, ...ON_MARKET.slice(1)]} />
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onStart}>Get a sign-in code</Button>
            <span className="text-small text-ink-muted">The code lasts 15 minutes.</span>
          </div>
        </div>
      );

    case "requesting":
      return <Notice tone="waiting" title="Asking Agent Market for a code" />;

    case "unavailable":
      return (
        <div className="space-y-6">
          <Notice
            tone="neutral"
            title="Sign-in isn't switched on yet"
            action={
              <>
                {onSkipToLimit && (
                  <Button variant="secondary" onClick={onSkipToLimit}>
                    See the spending limit step
                  </Button>
                )}
                <Link href="/start" className="inline-flex min-h-11 items-center text-small font-medium underline underline-offset-4 hover:text-ink">
                  Start a milestone, no account needed
                </Link>
              </>
            }
          >
            <p>{flow.reason}</p>
            <p className="mt-1.5">Nothing was sent to Agent Market. Rerunning your reviewer&apos;s checks works without an account.</p>
          </Notice>
          <Steps title="Once it's on, you'll do this on Agent Market" items={ON_MARKET} />
        </div>
      );

    case "pending":
      return (
        <div className="space-y-6">
          <ClaimCode userCode={flow.userCode} verificationUri={flow.verificationUri} verificationUriComplete={flow.verificationUriComplete} expiresAt={flow.expiresAt} now={now} />
          <Notice tone="waiting" title="Waiting for you on Agent Market">
            This page moves on by itself once you approve. Keep it open.
          </Notice>
          <Steps title={`On ${MARKET_ORIGIN.replace("https://", "")}`} items={ON_MARKET} />
        </div>
      );

    case "approved":
      return (
        <Notice tone="good" title={`Signed in as ${flow.identity.handle}`} action={onContinue && <Button onClick={onContinue}>Set your spending limit</Button>}>
          Agent Market approved <span className="font-mono text-small">{HIRING_SCOPE}</span> access for{" "}
          <span className="font-mono text-small text-ink">{flow.identity.nearAccountId ?? flow.identity.handle}</span>. UNSTUCK can&apos;t hire anyone until you set a limit.
        </Notice>
      );

    case "expired":
      return (
        <Notice tone="neutral" title="The code expired before it was approved" action={<Button onClick={onStart}>Get a new code</Button>}>
          Codes last 15 minutes. Nothing was connected, so you can start over.
        </Notice>
      );

    case "denied":
      return (
        <Notice
          tone="neutral"
          title="You declined on Agent Market"
          action={
            <>
              <Button onClick={onStart}>Try again</Button>
              <Link href="/" className="inline-flex min-h-11 items-center text-small font-medium underline underline-offset-4">
                Not now
              </Link>
            </>
          }
        >
          Nothing was connected and nothing was spent. You can still rerun checks without an account.
        </Notice>
      );

    case "error":
      return (
        <Notice tone="bad" title="Agent Market didn't answer" action={<Button onClick={onStart}>Try again</Button>}>
          {flow.message}
        </Notice>
      );
  }
}
