"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState, useTransition, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/button";
import { AccessTerms, DeviceFlowPanel, LimitForm, LimitReview, Notice } from "@/components/account";
import { checkLimit, expiryFrom, money, type DeviceFlow, type MarketIdentity } from "@/lib/account";
import { Stepper, type StepperItem } from "@/components/stepper";
import { pollSignIn, saveLimit, startSignIn, type SaveLimitResult } from "./actions";
import { CONNECT_STEPS, canOpenStep, connectReducer, INITIAL_CONNECT, signedIn, type ConnectStep } from "./connect-state";

const TEXT: Record<ConnectStep, { title: string; lead: string; ahead: string }> = {
  about: {
    title: "Why an account",
    lead: "Fixes are built by agents on NEAR Agent Market, and agents are paid there. Connecting lets UNSTUCK hire one for you, from your own account.",
    ahead: "What it can and can't do",
  },
  code: {
    title: "Sign in with a code",
    lead: "You approve on market.near.ai with a short code. UNSTUCK never sees a password or a key.",
    ahead: "A code you type on Agent Market",
  },
  limit: {
    title: "Your spending limit",
    lead: "The most UNSTUCK may pay for one hire and for all of them. Nothing is spent here. This only sets the ceiling.",
    ahead: "Per hire, in total, and for how long",
  },
  confirm: {
    title: "Check and confirm",
    lead: "Read it the way UNSTUCK will follow it. You can change or turn it off from your account at any time.",
    ahead: "The limit, as it will apply",
  },
};

const POLL_FAILED: DeviceFlow = { kind: "error", message: "UNSTUCK lost touch with this page's sign-in. Get a new code to try again." };
const SLOW_DOWN_SECONDS = 5;

/** `signedInAs` is the session the server already holds, so a returning owner starts signed in. */
export function ConnectFlow({ initialStep, signedInAs }: { initialStep: ConnectStep; signedInAs: MarketIdentity | null }) {
  const [state, dispatch] = useReducer(connectReducer, {
    ...INITIAL_CONNECT,
    step: initialStep,
    flow: signedInAs ? { kind: "approved", identity: signedInAs } : INITIAL_CONNECT.flow,
  });
  const [now] = useState(() => new Date());
  const [pending, startTransition] = useTransition();
  const [saveResult, setSaveResult] = useState<SaveLimitResult | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // Focus belongs to the browser, outside React: move it to the new step's heading so keyboard and
  // screen reader users land on the step, not on a button that's gone. Skipped on first render.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [state.step, state.saved]);

  // Agent Market is the external system here: while a code is pending, ask the server once per interval whether the
  // owner approved. Every answer dispatches a new flow object, which schedules the next poll or ends polling.
  const { flow } = state;
  useEffect(() => {
    if (flow.kind !== "pending") return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const next = await pollSignIn().catch((): DeviceFlow => POLL_FAILED);
      if (cancelled) return;
      dispatch({
        type: "flow",
        flow:
          next.kind === "waiting"
            ? new Date() >= flow.expiresAt
              ? { kind: "expired" }
              : { ...flow, intervalSeconds: flow.intervalSeconds + (next.slowDown ? SLOW_DOWN_SECONDS : 0) }
            : next,
      });
    }, flow.intervalSeconds * 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [flow]);

  const check = checkLimit(state.draft);
  const index = CONNECT_STEPS.indexOf(state.step);
  const identity = state.flow.kind === "approved" ? state.flow.identity : null;

  const detail: Record<ConnectStep, string> = {
    about: index > 0 ? "Read" : TEXT.about.ahead,
    code: identity ? `Signed in as ${identity.handle}` : state.flow.kind === "unavailable" ? "Not switched on yet" : index > 1 ? "Not signed in yet" : TEXT.code.ahead,
    limit: state.limitChecked && check.ok ? `${money(check.perHireCapCents)} a hire, ${money(check.totalCapCents)} in total` : TEXT.limit.ahead,
    confirm: state.saved ? "Set" : TEXT.confirm.ahead,
  };
  // Sign-in only counts as done when Agent Market approved; reading past it doesn't.
  const stepDone = (step: ConnectStep, i: number) => state.saved || (step === "code" ? signedIn(state) : i < index);
  const items: StepperItem[] = CONNECT_STEPS.map((step, i) => ({
    id: step,
    title: TEXT[step].title,
    detail: detail[step],
    state: !state.saved && step === state.step ? "active" : stepDone(step, i) ? "done" : "upcoming",
    onOpen: step !== state.step && canOpenStep(state, step) ? () => dispatch({ type: "goto", step }) : undefined,
  }));

  function start() {
    dispatch({ type: "flow", flow: { kind: "requesting" } });
    startTransition(async () => {
      dispatch({ type: "flow", flow: await startSignIn() });
    });
  }

  function confirm() {
    setSaveResult(null);
    startTransition(async () => {
      const result = await saveLimit(state.draft);
      setSaveResult(result);
      if (result.ok) dispatch({ type: "saved" });
    });
  }

  let body: ReactNode;
  if (state.saved && check.ok) {
    body = (
      <Notice
        tone="good"
        title="Your limit is set"
        action={
          <>
            <ButtonLink href="/account">Open your account</ButtonLink>
            <ButtonLink href="/start" variant="secondary">
              Start a milestone
            </ButtonLink>
          </>
        }
      >
        UNSTUCK may pay up to {money(check.perHireCapCents)} for one hire and {money(check.totalCapCents)} in total. Your next hire starts from a milestone page.
      </Notice>
    );
  } else {
    switch (state.step) {
      case "about":
        body = (
          <div className="space-y-7">
            <AccessTerms />
            <div className="grid gap-4 text-small text-ink-secondary sm:grid-cols-3">
              <Fact title="You need it for">Part 3 of a milestone: getting the missing piece built.</Fact>
              <Fact title="You don't need it for">Rerunning checks, the run record, or sharing it.</Fact>
              <Fact title="It takes">About two minutes and a Google sign-in on Agent Market.</Fact>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
              <Link href="/" className="mr-auto inline-flex min-h-11 items-center text-small font-medium text-ink-secondary underline-offset-4 hover:text-ink hover:underline">
                Not now
              </Link>
              <Button onClick={() => dispatch({ type: "goto", step: "code" })}>Continue to sign-in</Button>
            </div>
          </div>
        );
        break;
      case "code":
        body = (
          <DeviceFlowPanel
            flow={state.flow}
            onStart={start}
            onContinue={() => dispatch({ type: "goto", step: "limit" })}
            onSkipToLimit={() => dispatch({ type: "goto", step: "limit" })}
          />
        );
        break;
      case "limit":
        body = (
          <div className="space-y-6">
            {!signedIn(state) && (
              <Notice tone="neutral" title="You're not signed in">
                You can fill this in to see how it works. It&apos;s only saved to an Agent Market account, so it waits for sign-in.
              </Notice>
            )}
            <LimitForm
              draft={state.draft}
              onChange={(draft) => dispatch({ type: "draft", draft })}
              onReview={() => dispatch({ type: "limitChecked" })}
              onBack={() => dispatch({ type: "goto", step: "code" })}
              now={now}
            />
          </div>
        );
        break;
      case "confirm":
        body = check.ok ? (
          <LimitReview
            terms={{ perHireCapCents: check.perHireCapCents, totalCapCents: check.totalCapCents, expiresAt: expiryFrom(now, check.days), hiresCovered: check.hiresCovered }}
            identity={identity}
            status={
              saveResult && !saveResult.ok ? (
                <Notice tone={saveResult.reason === "invalid" ? "bad" : "neutral"} title={saveResult.reason === "invalid" ? "The limit didn't pass" : "Nothing was saved"}>
                  {saveResult.message}
                </Notice>
              ) : null
            }
            actions={
              <>
                <Button variant="quiet" onClick={() => dispatch({ type: "goto", step: "limit" })} className="mr-auto">
                  Change it
                </Button>
                {signedIn(state) ? (
                  <Button onClick={confirm} disabled={pending}>
                    {pending ? "Setting the limit" : "Set this limit"}
                  </Button>
                ) : (
                  <Button onClick={() => dispatch({ type: "goto", step: "code" })}>Sign in first</Button>
                )}
              </>
            }
          />
        ) : null;
        break;
    }
  }

  const heading = state.saved ? { title: "Connected", lead: "Agent Market is connected and your limit is set." } : TEXT[state.step];

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      <aside className="space-y-5 lg:sticky lg:top-24">
        <Stepper items={items} />
        <div className="hidden rounded-panel border border-border px-4 py-4 text-small text-ink-secondary lg:block">
          <p className="font-semibold text-ink">Nothing is spent here</p>
          <p className="mt-2">Signing in and setting a limit cost nothing. Money only moves when you hire from a milestone, at a price you see first.</p>
        </div>
      </aside>

      <section aria-labelledby="step-title" className="min-w-0 rounded-sheet border border-border bg-surface px-4 pt-5 shadow-object sm:px-8 sm:pt-8">
        {!state.saved && (
          <p className="hidden text-small font-medium text-ink-secondary tabular-nums lg:block">
            Step {index + 1} of {CONNECT_STEPS.length}
          </p>
        )}
        <h2 id="step-title" ref={headingRef} tabIndex={-1} className="scroll-mt-24 text-h1 font-semibold outline-none lg:mt-1">
          {heading.title}
        </h2>
        <p className="mt-2 max-w-(--container-reading) text-ink-secondary">{heading.lead}</p>
        <div className="mt-7 pb-6 sm:pb-8">{body}</div>
      </section>
    </div>
  );
}

function Fact({ title, children }: { title: string; children: string }) {
  return (
    <div className="border-t-2 border-ink pt-2.5">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}
