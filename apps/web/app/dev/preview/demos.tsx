"use client";

import { useState } from "react";
import { DeviceFlowPanel, HireRuler, LimitForm, LimitReview } from "@/components/account";
import { Button } from "@/components/button";
import { checkLimit, DEFAULT_LIMIT, expiryFrom, NOT_CONNECTED_REASON, type DeviceFlow, type LimitDraft, type MarketIdentity } from "@/lib/account";
import { KitExample, KitGrid } from "./kit";

const noop = () => undefined;

/** Every sign-in state, frozen at one moment so the countdown doesn't move. */
export function DeviceFlowStates({ now, identity }: { now: string; identity: MarketIdentity }) {
  const at = new Date(now);
  const flows: [string, DeviceFlow][] = [
    ["Before a code is asked for", { kind: "idle" }],
    ["Sign-in off: no token key on this server", { kind: "unavailable", reason: NOT_CONNECTED_REASON }],
    ["Asking for a code", { kind: "requesting" }],
    [
      "Code issued, waiting for approval",
      {
        kind: "pending",
        userCode: "WDJB-MJHT",
        verificationUri: "https://market.near.ai/device",
        verificationUriComplete: "https://market.near.ai/device?user_code=WDJB-MJHT",
        expiresAt: new Date(at.getTime() + 9 * 60_000 + 14_000),
        intervalSeconds: 5,
      },
    ],
    ["Approved", { kind: "approved", identity }],
    ["Code ran out", { kind: "expired" }],
    ["Turned down on Agent Market", { kind: "denied" }],
    ["Agent Market answered with an error", { kind: "error", message: "Agent Market answered 503. Try again in a minute." }],
  ];
  return (
    <KitGrid>
      {flows.map(([label, flow]) => (
        <KitExample key={label} label={label}>
          <div className="rounded-sheet border border-border bg-surface p-5 sm:p-6">
            <DeviceFlowPanel flow={flow} onStart={noop} onContinue={noop} onSkipToLimit={noop} now={at} />
          </div>
        </KitExample>
      ))}
    </KitGrid>
  );
}

/** The limit form wired to local state, then the review sheet it leads to. Nothing is saved. */
export function LimitDemo({ now, identity }: { now: string; identity: MarketIdentity }) {
  const at = new Date(now);
  const [draft, setDraft] = useState<LimitDraft>(DEFAULT_LIMIT);
  const [reviewing, setReviewing] = useState(false);
  const check = checkLimit(draft);

  return (
    <KitGrid>
      <KitExample label="Setting the limit (type to see the checks)">
        <div className="rounded-sheet border border-border bg-surface p-5 sm:p-6">
          <LimitForm draft={draft} onChange={setDraft} onReview={() => setReviewing(true)} now={at} />
        </div>
      </KitExample>
      <KitExample label={reviewing ? "Review sheet" : "Review sheet (press the form's review button)"}>
        {check.ok ? (
          <LimitReview
            terms={{ perHireCapCents: check.perHireCapCents, totalCapCents: check.totalCapCents, expiresAt: expiryFrom(at, check.days), hiresCovered: check.hiresCovered }}
            identity={identity}
            actions={
              <>
                <Button disabled>Set this limit</Button>
                <Button variant="secondary" onClick={() => setReviewing(false)}>
                  Change it
                </Button>
              </>
            }
          />
        ) : (
          <HireRuler perHireCents={null} totalCents={null} emptyText="Fix the amounts in the form to see the review sheet." />
        )}
      </KitExample>
    </KitGrid>
  );
}
